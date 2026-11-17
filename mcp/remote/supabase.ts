import { AsyncLocalStorage } from 'node:async_hooks'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Request-scoped Supabase client for the remote (HTTP) MCP server.
 *
 * The module services import a single `supabase` export. In the remote build
 * `@/services/supabase` points here: `supabase` is a proxy that forwards every
 * call to the client of the request being handled, which carries that user's
 * OAuth access token. Queries run as the user, so RLS applies as in the app.
 */
const store = new AsyncLocalStorage<SupabaseClient>()

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = store.getStore()
    if (!client) throw new Error('No ODEEN request in progress')
    const value = Reflect.get(client, prop, client) as unknown
    return typeof value === 'function'
      ? (value as (...a: unknown[]) => unknown).bind(client)
      : value
  },
})

export interface SupabaseConfig {
  url: string
  anonKey: string
}

/**
 * Builds a client signed in with the given access token. Resolves `null` when
 * the token is invalid or expired (setSession validates it against Auth).
 */
export async function clientForToken(
  config: SupabaseConfig,
  accessToken: string,
): Promise<SupabaseClient | null> {
  const client = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  // The MCP client refreshes its own tokens; this session only lives for one request.
  try {
    const { data, error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: 'unused',
    })
    if (error || !data.user) return null
    return client
  } catch {
    // Malformed tokens make setSession throw instead of returning an error.
    return null
  }
}

/** Runs `fn` with `supabase` bound to `client`. */
export function withClient<T>(client: SupabaseClient, fn: () => Promise<T>): Promise<T> {
  return store.run(client, fn)
}
