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
  storageDate,
} from '@/modules/assistant/composables/intentionHelpers'
import { createCapture, fetchCaptures } from '@/modules/assistant/services/captures.service'
import { fetchIntentions } from '@/modules/assistant/services/intentions.service'
import { ok, signedIn, unwrap } from './result'

const captureKind = z.enum(['distraction', 'open_loop', 'idea', 'problem', 'worry', 'waiting_for'])
const captureStatus = z.enum(['inbox', 'converted', 'archived'])

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
        date: z.iso.date().optional().describe('YYYY-MM-DD, in the local time zone.'),
      },
      annotations: { readOnlyHint: true },
    },
    signedIn(async (args) => {
      const day = args.date ? fromISODate(args.date) : new Date()
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
}
