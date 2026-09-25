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

export type IntentionScope = 'day' | 'week' | 'personal'

export type IntentionPosition = 1 | 2 | 3

export interface Intention {
  id: string
  user_id: string
  /** ISO date (YYYY-MM-DD). Monday of the week for `week` scope. */
  date: string
  scope: IntentionScope
  position: IntentionPosition
  task_id: string | null
  text: string
  when_text: string | null
  where_text: string | null
  first_action: string | null
  done: boolean
  created_at: string
}

export type CreateIntentionPayload = Pick<
  Intention,
  'date' | 'scope' | 'position' | 'task_id' | 'text' | 'when_text' | 'where_text' | 'first_action'
>

export type UpdateIntentionPayload = Partial<
  Pick<Intention, 'text' | 'when_text' | 'where_text' | 'first_action' | 'done'>
> & { id: string }
