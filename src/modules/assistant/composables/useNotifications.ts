import { ref } from 'vue'
import * as notificationsService from '@/modules/assistant/services/notifications.service'
import type {
  AssistantError,
  NotificationSettings,
  PushStatus,
  UpdateNotificationSettingsPayload,
} from '@/modules/assistant/types'

export type EffectiveNotificationSettings = Required<UpdateNotificationSettingsPayload>

// Mirrors the column defaults in the push notifications migration.
export const DEFAULT_NOTIFICATION_SETTINGS: EffectiveNotificationSettings = {
  timezone: 'UTC',
  intentions_enabled: true,
  intentions_time: '09:00',
  plan_tomorrow_enabled: true,
  plan_tomorrow_time: '16:30',
  progress_enabled: true,
  progress_time: '18:00',
  schedule_enabled: true,
  schedule_lead_minutes: 10,
}

export const LEAD_MINUTE_OPTIONS = [5, 10, 15, 30] as const

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

const settings = ref<NotificationSettings | null>(null)
const status = ref<PushStatus>('unsupported')
const loading = ref(false)
const error = ref<AssistantError | null>(null)

export function useNotifications() {
  async function load(): Promise<void> {
    loading.value = true
    error.value = null

    const [result, pushStatus] = await Promise.all([
      notificationsService.fetchNotificationSettings(),
      notificationsService.getPushStatus(),
    ])

    loading.value = false
    status.value = pushStatus
    if (result.error) {
      error.value = result.error
      return
    }
    settings.value = result.data
  }

  /** Saves the change, always stamping this device's timezone. */
  async function save(payload: UpdateNotificationSettingsPayload): Promise<boolean> {
    error.value = null
    const result = await notificationsService.saveNotificationSettings({
      ...payload,
      timezone: browserTimezone(),
    })
    if (result.error) {
      error.value = result.error
      return false
    }
    settings.value = result.data
    return true
  }

  async function enable(): Promise<void> {
    loading.value = true
    error.value = null

    const result = await notificationsService.enablePush()

    loading.value = false
    if (result.error) {
      error.value = result.error
      return
    }
    status.value = result.data ?? 'off'
    // The sender skips users without a settings row: create it on first opt-in.
    if (status.value === 'on') await save({})
  }

  async function disable(): Promise<void> {
    loading.value = true
    error.value = null

    const result = await notificationsService.disablePush()

    loading.value = false
    if (result.error) {
      error.value = result.error
      return
    }
    status.value = result.data ?? 'off'
  }

  /** Sends a push to this user's devices; returns a short status line. */
  async function sendTest(): Promise<string | null> {
    error.value = null
    const result = await notificationsService.sendTestPush()
    if (result.error || !result.data) {
      error.value = result.error ?? { message: 'Test failed' }
      return null
    }
    const { devices, sent } = result.data
    return sent > 0 ? `Sent to ${sent} of ${devices} device(s).` : 'Nothing was delivered.'
  }

  /** Saved settings with times trimmed to HH:MM, or defaults. */
  function effective(): EffectiveNotificationSettings {
    if (!settings.value) return DEFAULT_NOTIFICATION_SETTINGS
    const s = settings.value
    return {
      timezone: s.timezone,
      intentions_enabled: s.intentions_enabled,
      intentions_time: s.intentions_time.slice(0, 5),
      plan_tomorrow_enabled: s.plan_tomorrow_enabled,
      plan_tomorrow_time: s.plan_tomorrow_time.slice(0, 5),
      progress_enabled: s.progress_enabled,
      progress_time: s.progress_time.slice(0, 5),
      schedule_enabled: s.schedule_enabled,
      schedule_lead_minutes: s.schedule_lead_minutes,
    }
  }

  return {
    settings,
    status,
    loading,
    error,
    load,
    save,
    enable,
    disable,
    sendTest,
    effective,
    isInstalledApp: notificationsService.isInstalledApp,
  }
}
