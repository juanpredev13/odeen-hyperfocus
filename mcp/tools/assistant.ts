import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  byStatus,
  DEFAULT_CAPTURE_KIND,
  MAX_CAPTURE_LENGTH,
} from '@/modules/assistant/composables/captureHelpers'
import {
  fromISODate,
  intentionsFor,
  nextFreePosition,
  storageDate,
} from '@/modules/assistant/composables/intentionHelpers'
import { createCapture, fetchCaptures } from '@/modules/assistant/services/captures.service'
import {
  createIntention,
  fetchIntentions,
  updateIntention,
} from '@/modules/assistant/services/intentions.service'
import { fetchNotificationSettings } from '@/modules/assistant/services/notificationSettings.service'
import type { Intention, IntentionScope } from '@/modules/assistant/types'
import { ok, signedIn, unwrap } from './result'

const captureKind = z.enum(['distraction', 'open_loop', 'idea', 'problem', 'worry', 'waiting_for'])
const captureStatus = z.enum(['inbox', 'converted', 'archived'])
const intentionScope = z.enum(['day', 'personal', 'week'])
const isoDate = z.iso.date().describe("YYYY-MM-DD in the user's time zone. Defaults to today.")
const optionalText = z.string().trim().max(500).optional()

/**
 * Today in the user's time zone. The remote server runs in UTC, so it uses the
 * timezone saved with the reminder settings; without one, the machine's date.
 */
async function today(): Promise<Date> {
  const { data } = await fetchNotificationSettings()
  if (!data?.timezone) return new Date()
  try {
    const iso = new Intl.DateTimeFormat('en-CA', { timeZone: data.timezone }).format(new Date())
    return fromISODate(iso)
  } catch {
    return new Date()
  }
}

async function dayFor(date: string | undefined): Promise<Date> {
  return date ? fromISODate(date) : today()
}

async function intentionsOn(scope: IntentionScope, day: Date): Promise<Intention[]> {
  const date = storageDate(scope, day)
  return intentionsFor(unwrap(await fetchIntentions([date])), scope, day)
}

export function registerAssistantTools(server: McpServer): void {
  server.registerTool(
    'add_capture',
    {
      title: 'Add capture',
      description:
        'Drops a note into the capture inbox to process later: a distraction, an open loop, an idea, a problem, a worry, or something the user is waiting for. Use it for anything that should not interrupt the current work.',
      inputSchema: {
        text: z.string().trim().min(1).max(MAX_CAPTURE_LENGTH),
        kind: captureKind.default(DEFAULT_CAPTURE_KIND),
      },
    },
    signedIn(async (args) => ok(unwrap(await createCapture({ text: args.text, kind: args.kind })))),
  )

  server.registerTool(
    'list_captures',
    {
      title: 'List captures',
      description:
        'Captures with the given status (the unprocessed inbox by default), newest first.',
      inputSchema: {
        status: captureStatus.default('inbox'),
        kind: captureKind.optional(),
      },
      annotations: { readOnlyHint: true },
    },
    signedIn(async (args) => {
      const captures = byStatus(unwrap(await fetchCaptures()), args.status)
      return ok(captures.filter((capture) => !args.kind || capture.kind === args.kind))
    }),
  )

  server.registerTool(
    'list_intentions',
    {
      title: 'List intentions',
      description:
        "The user's intentions (Rule of 3) for a day: that day's work and personal intentions, and the intentions of its week. Defaults to today. An intention's id can be passed as `intention_id` to a task.",
      inputSchema: {
        date: isoDate.optional(),
      },
      annotations: { readOnlyHint: true },
    },
    signedIn(async (args) => {
      const day = await dayFor(args.date)
      const date = storageDate('day', day)
      const week_start = storageDate('week', day)
      const intentions = unwrap(await fetchIntentions([date, week_start]))

      return ok({
        date,
        week_start,
        day: intentionsFor(intentions, 'day', day),
        personal: intentionsFor(intentions, 'personal', day),
        week: intentionsFor(intentions, 'week', day),
      })
    }),
  )

  server.registerTool(
    'set_intention',
    {
      title: 'Set intention',
      description:
        "Writes one of the user's intentions (Rule of 3: at most 3 per scope and day). `day` and `personal` intentions belong to a date, `week` intentions to the week of that date. Without `position` it takes the first free slot (1–3); with `position` it replaces that slot's text and details. Use a future date (e.g. tomorrow) to plan ahead.",
      inputSchema: {
        text: z.string().trim().min(1).max(300),
        scope: intentionScope.default('day'),
        date: isoDate.optional(),
        position: z
          .union([z.literal(1), z.literal(2), z.literal(3)])
          .optional()
          .describe('Slot 1–3. Omit to use the first free one.'),
        task_id: z.uuid().optional().describe('A task to work on for this intention.'),
        when_text: optionalText.describe('When it will happen, e.g. "9:00 after coffee".'),
        where_text: optionalText.describe('Where it will happen.'),
        first_action: optionalText.describe('The first small physical step.'),
      },
    },
    signedIn(async (args) => {
      const day = await dayFor(args.date)
      const existing = await intentionsOn(args.scope, day)
      const position = args.position ?? nextFreePosition(existing)
      if (position === null) {
        throw new Error(
          `All 3 ${args.scope} intentions for ${storageDate(args.scope, day)} are set. Pass \`position\` to replace one.`,
        )
      }

      const details = {
        text: args.text,
        when_text: args.when_text ?? null,
        where_text: args.where_text ?? null,
        first_action: args.first_action ?? null,
      }
      const current = existing.find((i) => i.position === position)
      if (current) {
        return ok(
          unwrap(
            await updateIntention({
              id: current.id,
              ...details,
              ...(args.task_id !== undefined && { task_id: args.task_id }),
            }),
          ),
        )
      }

      return ok(
        unwrap(
          await createIntention({
            ...details,
            date: storageDate(args.scope, day),
            scope: args.scope,
            position,
            task_id: args.task_id ?? null,
          }),
        ),
      )
    }),
  )

  server.registerTool(
    'complete_intention',
    {
      title: 'Complete intention',
      description:
        'Marks an intention done (or not done with `done: false`). Get ids from `list_intentions`.',
      inputSchema: {
        id: z.uuid(),
        done: z.boolean().default(true),
      },
    },
    signedIn(async (args) => ok(unwrap(await updateIntention({ id: args.id, done: args.done })))),
  )
}
