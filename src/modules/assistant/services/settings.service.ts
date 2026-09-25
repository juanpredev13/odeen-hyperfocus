import { supabase } from '@/services/supabase'
import type {
  AssistantSettings,
  AssistantResult,
  UpdateAssistantSettingsPayload,
} from '@/modules/assistant/types'

/** Returns `data: null` when the user has not saved settings yet. */
export async function fetchSettings(): Promise<AssistantResult<AssistantSettings>> {
  const { data, error } = await supabase.from('assistant_settings').select('*').maybeSingle()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as AssistantSettings | null, error: null }
}

export async function saveSettings(
  payload: UpdateAssistantSettingsPayload,
): Promise<AssistantResult<AssistantSettings>> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { data: null, error: { message: 'Not authenticated' } }

  const { data, error } = await supabase
    .from('assistant_settings')
    .upsert({ ...payload, user_id: user.id, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as AssistantSettings, error: null }
}
