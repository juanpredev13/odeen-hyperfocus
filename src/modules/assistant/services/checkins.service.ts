import { supabase } from '@/services/supabase'
import { hasAnswer } from '@/modules/assistant/composables/checkinHelpers'
import type { AssistantResult, AwarenessCheckin, CheckinAnswers } from '@/modules/assistant/types'

export async function fetchCheckinsSince(sinceIso: string): Promise<AssistantResult<AwarenessCheckin[]>> {
  const { data, error } = await supabase
    .from('awareness_checkins')
    .select('*')
    .gte('at', sinceIso)
    .order('at', { ascending: false })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as AwarenessCheckin[], error: null }
}

export async function createCheckin(answers: CheckinAnswers): Promise<AssistantResult<AwarenessCheckin>> {
  if (!hasAnswer(answers)) return { data: null, error: { message: 'Answer at least one question' } }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { data: null, error: { message: 'Not authenticated' } }

  const { data, error } = await supabase
    .from('awareness_checkins')
    .insert({ ...answers, user_id: user.id })
    .select()
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as AwarenessCheckin, error: null }
}
