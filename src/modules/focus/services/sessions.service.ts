import { supabase } from '@/services/supabase'
import type { FocusResult, FocusSession, StartSessionPayload } from '@/modules/focus/types'

export async function fetchRecentSessions(limit = 20): Promise<FocusResult<FocusSession[]>> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as FocusSession[], error: null }
}

/** The user's running session, if any (a unique index allows at most one). */
export async function fetchActiveSession(): Promise<FocusResult<FocusSession>> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .is('ended_at', null)
    .maybeSingle()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as FocusSession | null, error: null }
}

export async function startSession(payload: StartSessionPayload): Promise<FocusResult<FocusSession>> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { data: null, error: { message: 'Not authenticated' } }

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({ ...payload, user_id: user.id, started_at: new Date().toISOString() })
    .select()
    .single()

  if (error) {
    const message = error.code === '23505' ? 'Another focus session is already running' : error.message
    return { data: null, error: { message } }
  }

  return { data: data as FocusSession, error: null }
}

export async function updateSession(
  id: string,
  fields: Partial<Pick<FocusSession, 'refocus_count' | 'extended' | 'notes' | 'ended_at' | 'actual_minutes'>>,
): Promise<FocusResult<FocusSession>> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as FocusSession, error: null }
}

export async function countSessionCaptures(sessionId: string): Promise<FocusResult<number>> {
  const { count, error } = await supabase
    .from('captures')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  if (error) return { data: null, error: { message: error.message } }

  return { data: count ?? 0, error: null }
}
