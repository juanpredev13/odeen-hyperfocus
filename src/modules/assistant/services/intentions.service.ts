import { supabase } from '@/services/supabase'
import type {
  AssistantResult,
  CreateIntentionPayload,
  Intention,
  UpdateIntentionPayload,
} from '@/modules/assistant/types'

export const MAX_INTENTIONS_PER_SCOPE = 3

/** Intentions stored on any of the given ISO dates (day, personal and week rows). */
export async function fetchIntentions(dates: string[]): Promise<AssistantResult<Intention[]>> {
  const { data, error } = await supabase
    .from('intentions')
    .select('*')
    .in('date', dates)
    .order('position', { ascending: true })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Intention[], error: null }
}

export async function createIntention(
  payload: CreateIntentionPayload,
): Promise<AssistantResult<Intention>> {
  const text = payload.text.trim()
  if (!text) return { data: null, error: { message: 'Intention text is required' } }
  if (payload.position < 1 || payload.position > MAX_INTENTIONS_PER_SCOPE) {
    return { data: null, error: { message: `Up to ${MAX_INTENTIONS_PER_SCOPE} intentions per scope` } }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { data: null, error: { message: 'Not authenticated' } }

  const { data, error } = await supabase
    .from('intentions')
    .insert({ ...payload, text, user_id: user.id })
    .select()
    .single()

  if (error) {
    const message =
      error.code === '23505'
        ? `Up to ${MAX_INTENTIONS_PER_SCOPE} intentions per scope`
        : error.message
    return { data: null, error: { message } }
  }

  return { data: data as Intention, error: null }
}

export async function updateIntention(
  payload: UpdateIntentionPayload,
): Promise<AssistantResult<Intention>> {
  const { id, ...fields } = payload
  if (fields.text !== undefined && !fields.text.trim()) {
    return { data: null, error: { message: 'Intention text is required' } }
  }

  const { data, error } = await supabase
    .from('intentions')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Intention, error: null }
}

export async function deleteIntention(id: string): Promise<AssistantResult<null>> {
  const { error } = await supabase.from('intentions').delete().eq('id', id)

  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}
