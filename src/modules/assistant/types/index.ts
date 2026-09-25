export type Provider = 'gmail' | 'google-calendar' | 'obsidian'

export type CheckinInterval = 0 | 60 | 90

export interface AssistantSettings {
  user_id: string
  checkin_interval: CheckinInterval
  default_session_minutes: number
  distraction_checklist: string[]
  break_activities: string[]
  updated_at: string
}

export type UpdateAssistantSettingsPayload = Partial<
  Omit<AssistantSettings, 'user_id' | 'updated_at'>
>

/** Client-visible columns only — the encrypted token is never selectable. */
export interface AssistantConnection {
  id: string
  user_id: string
  provider: Provider
  scopes: string[]
  connected_at: string
}

export interface ProviderInfo {
  id: Provider
  label: string
  description: string
  icon: string
}

export interface AssistantError {
  message: string
}

export interface AssistantResult<T> {
  data: T | null
  error: AssistantError | null
}
