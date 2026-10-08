import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { supabase } from '@/services/supabase'

/** Shape shared by every module service (`TasksResult`, `AssistantResult`, …). */
interface ServiceResult<T> {
  data: T | null
  error: { message: string } | null
}

export function ok(value: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
}

export function fail(message: string): CallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true }
}

/** Unwraps a service result, throwing its error so `signedIn` reports it. */
export function unwrap<T>(result: ServiceResult<T>): T {
  if (result.error) throw new Error(result.error.message)
  if (result.data === null) throw new Error('Not found')
  return result.data
}

/**
 * Wraps a tool handler: refuses to run without a session (as anon, RLS would
 * return empty lists that look like real answers) and turns thrown errors into
 * tool errors.
 */
export function signedIn<Args>(
  handler: (args: Args) => Promise<CallToolResult>,
): (args: Args) => Promise<CallToolResult> {
  return async (args) => {
    const { data, error } = await supabase.auth.getSession()
    if (error) return fail(`Could not load the ODEEN session: ${error.message}`)
    if (!data.session) {
      return fail('Not signed in to ODEEN. Run `pnpm mcp:login` in the odeen-hyperfocus repo.')
    }

    try {
      return await handler(args)
    } catch (thrown) {
      return fail(thrown instanceof Error ? thrown.message : String(thrown))
    }
  }
}
