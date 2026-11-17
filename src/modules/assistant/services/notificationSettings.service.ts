import { supabase } from '@/services/supabase'
import type {
  AssistantResult,
  NotificationSettings,
  UpdateNotificationSettingsPayload,
} from '@/modules/assistant/types'

const LEAD_MINUTES = [5, 10, 15, 30]
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

/** Returns `data: null` when the user has not saved notification settings yet. */
export async function fetchNotificationSettings(): Promise<AssistantResult<NotificationSettings>> {
  const { data, error } = await supabase.from('notification_settings').select('*').maybeSingle()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as NotificationSettings | null, error: null }
}

export async function saveNotificationSettings(
  payload: UpdateNotificationSettingsPayload,
): Promise<AssistantResult<NotificationSettings>> {
  for (const time of [payload.intentions_time, payload.plan_tomorrow_time, payload.progress_time]) {
    if (time !== undefined && !TIME_PATTERN.test(time)) {
      return { data: null, error: { message: 'Times must be HH:MM' } }
    }
  }
  if (
    payload.schedule_lead_minutes !== undefined &&
    !LEAD_MINUTES.includes(payload.schedule_lead_minutes)
  ) {
    return { data: null, error: { message: 'Lead time must be 5, 10, 15 or 30 minutes' } }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'Not authenticated' } }

  const { data, error } = await supabase
    .from('notification_settings')
    .upsert({ ...payload, user_id: user.id, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as NotificationSettings, error: null }
}
