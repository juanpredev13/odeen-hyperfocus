import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createProject, fetchProjects } from '@/modules/projects/services/projects.service'
import { parseTaskLink } from '@/modules/tasks/composables/taskLinkHelpers'
import {
  createTaskLink,
  deleteTaskLink,
  fetchTaskLinks,
} from '@/modules/tasks/services/taskLinks.service'
import {
  createTask,
  fetchAllTasks,
  fetchTask,
  fetchTasks,
  updateStatus,
  updateTask,
} from '@/modules/tasks/services/tasks.service'
import type { EnergyLevel, ImpactScore, Task, TaskLink } from '@/modules/tasks/types'
import { ok, signedIn, unwrap } from './result'

// Same limit the Kanban enforces. It is not a DB constraint yet, so two writers can still race past it.
const WIP_LIMIT = 3
const WIP_MESSAGE = `WIP limit reached: max ${WIP_LIMIT} tasks in Doing.`

const LINK_FORMATS =
  'a GitHub issue (URL or `owner/repo#123`) or an Obsidian note (`obsidian://open?vault=…&file=…` or `Vault/path/to/note`)'

const status = z.enum(['todo', 'doing', 'done'])
const title = z.string().trim().min(1).max(300)
const description = z.string().max(20000)
const energyLevel = z.union([z.literal(1), z.literal(2), z.literal(3)])
const impactScore = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])

type TaskSummary = Pick<
  Task,
  | 'id'
  | 'project_id'
  | 'title'
  | 'status'
  | 'energy_level'
  | 'impact_score'
  | 'is_attractive'
  | 'intention_id'
>

/** Lists leave out the description and graph position to stay short; `get_task` has them. */
function summarize(task: Task): TaskSummary {
  return {
    id: task.id,
    project_id: task.project_id,
    title: task.title,
    status: task.status,
    energy_level: task.energy_level,
    impact_score: task.impact_score,
    is_attractive: task.is_attractive,
    intention_id: task.intention_id,
  }
}

/** A missing task and one hidden by RLS look the same: say "not found" instead of the PostgREST error. */
async function findTask(id: string): Promise<Task> {
  const result = await fetchTask(id)
  if (!result.data) throw new Error(`Task ${id} not found.`)
  return result.data
}

async function assertRoomInDoing(projectId: string): Promise<void> {
  const tasks = unwrap(await fetchTasks(projectId))
  if (tasks.filter((task) => task.status === 'doing').length >= WIP_LIMIT) {
    throw new Error(WIP_MESSAGE)
  }
}

async function attachLink(taskId: string, input: string): Promise<TaskLink> {
  const parsed = parseTaskLink(input)
  if (!parsed) throw new Error(`"${input}" is not ${LINK_FORMATS}.`)
  return unwrap(await createTaskLink({ task_id: taskId, ...parsed }))
}

export function registerTaskTools(server: McpServer): void {
  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description: 'Every ODEEN project of the signed-in user. Tasks belong to a project.',
      annotations: { readOnlyHint: true },
    },
    signedIn(async () => {
      const projects = unwrap(await fetchProjects())
      return ok(projects.map(({ id, name }) => ({ id, name })))
    }),
  )

  server.registerTool(
    'create_project',
    {
      title: 'Create project',
      description:
        'Creates a project to hold tasks. Check `list_projects` first to avoid a duplicate.',
      inputSchema: { name: z.string().trim().min(1).max(120) },
    },
    signedIn(async (args) => {
      const { id, name } = unwrap(await createProject({ name: args.name }))
      return ok({ id, name })
    }),
  )

  server.registerTool(
    'list_tasks',
    {
      title: 'List tasks',
      description:
        'Tasks on the board, optionally limited to one project and/or one status. Use status "doing" to see what is in progress.',
      inputSchema: {
        project_id: z.uuid().optional(),
        status: status.optional(),
      },
      annotations: { readOnlyHint: true },
    },
    signedIn(async (args) => {
      const tasks = unwrap(
        args.project_id ? await fetchTasks(args.project_id) : await fetchAllTasks(),
      )
      return ok(tasks.filter((task) => !args.status || task.status === args.status).map(summarize))
    }),
  )

  server.registerTool(
    'get_task',
    {
      title: 'Get task',
      description: 'One task with its description and its GitHub issue / Obsidian note links.',
      inputSchema: { task_id: z.uuid() },
      annotations: { readOnlyHint: true },
    },
    signedIn(async (args) => {
      const task = await findTask(args.task_id)
      const links = unwrap(await fetchTaskLinks(args.task_id))
      return ok({ ...task, links })
    }),
  )

  server.registerTool(
    'create_task',
    {
      title: 'Create task',
      description: `Creates a task in a project. \`links\` attaches references in the same call; each one is ${LINK_FORMATS}. At most ${WIP_LIMIT} tasks per project can be "doing".`,
      inputSchema: {
        project_id: z.uuid(),
        title,
        description: description.optional(),
        status: status.default('todo'),
        energy_level: energyLevel.default(1).describe('Energy the task needs: 1 low, 3 high.'),
        impact_score: impactScore.default(1).describe('Impact: 1 low, 5 high.'),
        is_attractive: z.boolean().default(false).describe('Whether the task is fun to do.'),
        intention_id: z.uuid().optional().describe('Day or week intention this task serves.'),
        links: z.array(z.string()).max(10).optional(),
      },
    },
    signedIn(async (args) => {
      if (args.status === 'doing') await assertRoomInDoing(args.project_id)

      const task = unwrap(
        await createTask({
          project_id: args.project_id,
          title: args.title,
          description: args.description ?? null,
          status: args.status,
          energy_level: args.energy_level satisfies EnergyLevel,
          impact_score: args.impact_score satisfies ImpactScore,
          is_attractive: args.is_attractive,
          ...(args.intention_id ? { intention_id: args.intention_id } : {}),
        }),
      )

      // The task exists at this point, so a bad link is reported instead of failing the call.
      const links: TaskLink[] = []
      const link_errors: string[] = []
      for (const input of args.links ?? []) {
        try {
          links.push(await attachLink(task.id, input))
        } catch (thrown) {
          link_errors.push(thrown instanceof Error ? thrown.message : String(thrown))
        }
      }

      return ok({ ...task, links, ...(link_errors.length ? { link_errors } : {}) })
    }),
  )

  server.registerTool(
    'update_task',
    {
      title: 'Update task',
      description:
        'Edits a task. Only the fields given are changed. Use `move_task` to change the status. Pass null to clear the description or the intention.',
      inputSchema: {
        task_id: z.uuid(),
        title: title.optional(),
        description: description.nullable().optional(),
        energy_level: energyLevel.optional(),
        impact_score: impactScore.optional(),
        is_attractive: z.boolean().optional(),
        intention_id: z.uuid().nullable().optional(),
      },
    },
    signedIn(async (args) => {
      const { task_id, ...fields } = args
      if (Object.values(fields).every((value) => value === undefined)) {
        throw new Error('Nothing to update: give at least one field.')
      }
      return ok(unwrap(await updateTask({ id: task_id, ...fields })))
    }),
  )

  server.registerTool(
    'move_task',
    {
      title: 'Move task',
      description: `Changes a task's status (todo, doing, done). A project holds at most ${WIP_LIMIT} tasks in "doing".`,
      inputSchema: { task_id: z.uuid(), status },
    },
    signedIn(async (args) => {
      const task = await findTask(args.task_id)
      if (args.status === 'doing' && task.status !== 'doing') {
        await assertRoomInDoing(task.project_id)
      }
      return ok(summarize(unwrap(await updateStatus(args.task_id, args.status))))
    }),
  )

  server.registerTool(
    'link_task',
    {
      title: 'Link task',
      description: `Attaches a reference to a task: ${LINK_FORMATS}. To document work in Obsidian, write the note with your Obsidian tools first, then link it here.`,
      inputSchema: { task_id: z.uuid(), link: z.string().min(1).max(2000) },
    },
    signedIn(async (args) => ok(await attachLink(args.task_id, args.link))),
  )

  server.registerTool(
    'unlink_task',
    {
      title: 'Unlink task',
      description: 'Removes a link from a task. `link_id` comes from `get_task`.',
      inputSchema: { link_id: z.uuid() },
      annotations: { destructiveHint: true },
    },
    signedIn(async (args) => {
      const result = await deleteTaskLink(args.link_id)
      if (result.error) throw new Error(result.error.message)
      return ok({ removed: args.link_id })
    }),
  )
}
