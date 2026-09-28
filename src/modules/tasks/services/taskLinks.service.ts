import { supabase } from '@/services/supabase'
import { githubIssueRef, parseTaskLink } from '@/modules/tasks/composables/taskLinkHelpers'
import type {
  CreateTaskLinkPayload,
  GithubIssueInfo,
  TaskLink,
  TasksResult,
} from '@/modules/tasks/types'

export async function fetchTaskLinks(taskId: string): Promise<TasksResult<TaskLink[]>> {
  const { data, error } = await supabase
    .from('task_links')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as TaskLink[], error: null }
}

/** Kind of every link on the given tasks — enough to count them on cards. */
export async function fetchLinkKinds(
  taskIds: string[],
): Promise<TasksResult<Pick<TaskLink, 'task_id' | 'kind'>[]>> {
  const { data, error } = await supabase
    .from('task_links')
    .select('task_id, kind')
    .in('task_id', taskIds)

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Pick<TaskLink, 'task_id' | 'kind'>[], error: null }
}

export async function createTaskLink(payload: CreateTaskLinkPayload): Promise<TasksResult<TaskLink>> {
  // Re-parse so only canonical GitHub / Obsidian URLs reach the DB.
  const parsed = parseTaskLink(payload.url)
  if (!parsed || parsed.kind !== payload.kind || parsed.url !== payload.url) {
    return { data: null, error: { message: 'Not a valid GitHub issue or Obsidian note link.' } }
  }

  const { data, error } = await supabase.from('task_links').insert(payload).select().single()

  if (error) {
    const message =
      error.code === '23505' ? 'This link is already attached to the task.' : error.message
    return { data: null, error: { message } }
  }

  return { data: data as TaskLink, error: null }
}

export async function deleteTaskLink(id: string): Promise<TasksResult<null>> {
  const { error } = await supabase.from('task_links').delete().eq('id', id)

  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}

/** Reads title and state from the public GitHub API (no token, public repos only). */
export async function fetchGithubIssue(url: string): Promise<TasksResult<GithubIssueInfo>> {
  const ref = githubIssueRef(url)
  if (!ref) return { data: null, error: { message: 'Not a GitHub issue URL.' } }

  let response: Response
  try {
    response = await fetch(
      `https://api.github.com/repos/${ref.owner}/${ref.repo}/issues/${ref.number}`,
      { headers: { Accept: 'application/vnd.github+json' } },
    )
  } catch {
    return { data: null, error: { message: 'Could not reach GitHub.' } }
  }

  if (response.status === 404) {
    return { data: null, error: { message: 'Issue not found or repository is private.' } }
  }
  if (response.status === 403 || response.status === 429) {
    return { data: null, error: { message: 'GitHub rate limit reached. Try again later.' } }
  }
  if (!response.ok) {
    return { data: null, error: { message: `GitHub responded ${response.status}.` } }
  }

  const body: unknown = await response.json()
  if (
    typeof body !== 'object' ||
    body === null ||
    !('title' in body) ||
    !('state' in body) ||
    typeof body.title !== 'string' ||
    (body.state !== 'open' && body.state !== 'closed')
  ) {
    return { data: null, error: { message: 'Unexpected response from GitHub.' } }
  }

  return { data: { title: body.title, state: body.state }, error: null }
}
