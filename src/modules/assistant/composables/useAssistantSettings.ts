import { ref } from 'vue'
import * as settingsService from '@/modules/assistant/services/settings.service'
import type {
  AssistantError,
  AssistantSettings,
  UpdateAssistantSettingsPayload,
} from '@/modules/assistant/types'

// Mirrors the column defaults in the assistant_settings migration.
export const DEFAULT_SETTINGS: Required<UpdateAssistantSettingsPayload> = {
  checkin_interval: 0,
  default_session_minutes: 15,
  distraction_checklist: [
    'Phone in another room',
    'Do Not Disturb on',
    'Distraction blocker on',
    'Headphones on',
  ],
  break_activities: ['Short walk', 'Coffee without phone', 'Stretch', 'Chat with a colleague'],
}

const settings = ref<AssistantSettings | null>(null)
const loading = ref(false)
const error = ref<AssistantError | null>(null)

export function useAssistantSettings() {
  async function fetchSettings(): Promise<void> {
    loading.value = true
    error.value = null

    const result = await settingsService.fetchSettings()

    loading.value = false
    if (result.error) {
      error.value = result.error
      return
    }

    settings.value = result.data
  }

  async function saveSettings(payload: UpdateAssistantSettingsPayload): Promise<boolean> {
    loading.value = true
    error.value = null

    const result = await settingsService.saveSettings(payload)

    loading.value = false
    if (result.error) {
      error.value = result.error
      return false
    }

    settings.value = result.data
    return true
  }

  /** Saved settings, or defaults when the user has not saved any yet. */
  function effectiveSettings(): Required<UpdateAssistantSettingsPayload> {
    if (!settings.value) return DEFAULT_SETTINGS
    const { checkin_interval, default_session_minutes, distraction_checklist, break_activities } =
      settings.value
    return { checkin_interval, default_session_minutes, distraction_checklist, break_activities }
  }

  return {
    settings,
    loading,
    error,
    fetchSettings,
    saveSettings,
    effectiveSettings,
  }
}
