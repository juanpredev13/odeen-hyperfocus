import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// PKCE: email links (confirmation, password recovery) carry a one-time `code` instead of
// live tokens in the URL fragment, so no session tokens end up in browser history (#77).
// The client exchanges the code on load, so a link must be opened in the browser that asked for it.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
})
