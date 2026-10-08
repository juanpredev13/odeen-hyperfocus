import { createClient } from '@supabase/supabase-js'
import { supabaseAnonKey, supabaseUrl } from '../env'
import { sessionStorage } from './sessionStorage'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'ODEEN MCP: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (or ODEEN_SUPABASE_URL and ODEEN_SUPABASE_ANON_KEY in .env.mcp.local).',
  )
}

/**
 * Node counterpart of `src/services/supabase.ts`. The MCP build aliases
 * `@/services/supabase` to this file, so the module services run unchanged.
 * Anon key + the user's own session: every query still goes through RLS.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    persistSession: true,
    // No background timer: an expired session is refreshed when it is next read.
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
