import { supabase } from '@/services/supabase'
import type { AssistantConnection, AssistantResult } from '@/modules/assistant/types'

// Explicit column list: the encrypted token column is not granted to client roles.
const CONNECTION_COLUMNS = 'id, user_id, provider, scopes, connected_at'

export async function fetchConnections(): Promise<AssistantResult<AssistantConnection[]>> {
  const { data, error } = await supabase
    .from('assistant_connections')
    .select(CONNECTION_COLUMNS)
    .order('connected_at', { ascending: true })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as AssistantConnection[], error: null }
}

export async function deleteConnection(id: string): Promise<AssistantResult<null>> {
  const { error } = await supabase.from('assistant_connections').delete().eq('id', id)

  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}
