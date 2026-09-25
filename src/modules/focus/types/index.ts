export type SessionMode =
  | 'hyperfocus'
  | 'scatter_capture'
  | 'scatter_problem'
  | 'scatter_habitual'
  | 'break'

export interface FocusSession {
  id: string
  user_id: string
  task_id: string | null
  mode: SessionMode
  planned_minutes: number
  actual_minutes: number | null
  started_at: string
  ended_at: string | null
  refocus_count: number
  extended: boolean
  notes: string | null
  created_at: string
}

export type StartSessionPayload = Pick<FocusSession, 'task_id' | 'mode' | 'planned_minutes'>

/** setup → running → timeup (optional) → done */
export type SessionPhase = 'setup' | 'running' | 'timeup' | 'done'

export interface FocusError {
  message: string
}

export interface FocusResult<T> {
  data: T | null
  error: FocusError | null
}
