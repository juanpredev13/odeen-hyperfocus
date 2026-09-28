export type Provider = 'gmail' | 'google-calendar' | 'obsidian'

export type CheckinInterval = 0 | 60 | 90

export interface AssistantSettings {
  user_id: string
  checkin_interval: CheckinInterval
  default_session_minutes: number
  distraction_checklist: string[]
  break_activities: string[]
  end_sound: boolean
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

export type CaptureKind = 'distraction' | 'open_loop' | 'idea' | 'problem' | 'worry' | 'waiting_for'

export type CaptureStatus = 'inbox' | 'converted' | 'archived'

export interface Capture {
  id: string
  user_id: string
  session_id: string | null
  kind: CaptureKind
  text: string
  status: CaptureStatus
  task_id: string | null
  pinned: boolean
  created_at: string
  processed_at: string | null
}

export type CreateCapturePayload = Pick<Capture, 'kind' | 'text'> &
  Partial<Pick<Capture, 'session_id'>>

export interface CaptureKindInfo {
  id: CaptureKind
  label: string
  icon: string
  /** Prefix recognised by quick capture, e.g. "idea: ..." */
  prefix: string
}

export type SpaceFullness = 1 | 2 | 3

export type EnergyRating = 1 | 2 | 3 | 4 | 5

export interface AwarenessCheckin {
  id: string
  user_id: string
  at: string
  intentional: boolean | null
  on_consequential: boolean | null
  space_fullness: SpaceFullness | null
  energy: EnergyRating | null
}

export type CheckinAnswers = Pick<
  AwarenessCheckin,
  'intentional' | 'on_consequential' | 'space_fullness' | 'energy'
>

export type SegmentColor = 'emerald' | 'mint' | 'sage' | 'amber' | 'slate' | 'sky' | 'rose'

export interface ScheduleSegment {
  id: string
  user_id: string
  name: string
  icon: string
  color_key: SegmentColor
  position: number
  archived: boolean
  created_at: string
}

export type CreateSegmentPayload = Pick<ScheduleSegment, 'name' | 'icon' | 'color_key' | 'position'>

export type UpdateSegmentPayload = Partial<
  Pick<ScheduleSegment, 'name' | 'icon' | 'color_key' | 'position' | 'archived'>
> & { id: string }

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7

/**
 * A time range on one day. Template blocks have `day_of_week`; override
 * blocks have `date` (YYYY-MM-DD). Minutes are from local midnight.
 */
export interface ScheduleBlock {
  id: string
  user_id: string
  segment_id: string
  day_of_week: DayOfWeek | null
  date: string | null
  start_minute: number
  end_minute: number
  title: string | null
  note: string | null
  created_at: string
}

export type BlockDay = { day_of_week: DayOfWeek; date: null } | { day_of_week: null; date: string }

export type CreateBlockPayload = BlockDay &
  Pick<ScheduleBlock, 'segment_id' | 'start_minute' | 'end_minute' | 'title' | 'note'>

export type UpdateBlockPayload = Partial<
  Pick<ScheduleBlock, 'segment_id' | 'start_minute' | 'end_minute' | 'title' | 'note'>
> & { id: string }

export interface DayOverride {
  user_id: string
  date: string
  created_at: string
}
