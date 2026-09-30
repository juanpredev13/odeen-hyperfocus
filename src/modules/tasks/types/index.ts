export type TaskStatus = 'todo' | 'doing' | 'done'

export type EnergyLevel = 1 | 2 | 3
export type ImpactScore = 1 | 2 | 3 | 4 | 5

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  energy_level: EnergyLevel
  impact_score: ImpactScore
  is_attractive: boolean
  /** Day or week intention this task serves (#79). */
  intention_id: string | null
  position_x: number | null
  position_y: number | null
  created_at: string
}

export type CreateTaskPayload = Pick<
  Task,
  | 'project_id'
  | 'title'
  | 'description'
  | 'status'
  | 'energy_level'
  | 'impact_score'
  | 'is_attractive'
> &
  Partial<Pick<Task, 'intention_id'>>

/** Fields edited through TaskForm. */
export type TaskFormPayload = Omit<CreateTaskPayload, 'project_id'>

/** Productive × attractive grid used to steer time toward high-value work. */
export type TaskQuadrant = 'necessary' | 'purposeful' | 'unnecessary' | 'distracting'

export type UpdateTaskPayload = Partial<
  Omit<Task, 'id' | 'project_id' | 'created_at'>
> & { id: string }

export interface TasksError {
  message: string
}

export interface TasksResult<T> {
  data: T | null
  error: TasksError | null
}

export type TaskLinkKind = 'github_issue' | 'obsidian_note'

/** An external reference attached to a task (#75). */
export interface TaskLink {
  id: string
  task_id: string
  kind: TaskLinkKind
  url: string
  label: string
  created_at: string
}

export type CreateTaskLinkPayload = Pick<TaskLink, 'task_id' | 'kind' | 'url' | 'label'>

/** Result of parsing what the user pasted into the link input. */
export type ParsedTaskLink = Pick<TaskLink, 'kind' | 'url' | 'label'>

export type GithubIssueState = 'open' | 'closed'

/** Live issue details from the public GitHub API. */
export interface GithubIssueInfo {
  title: string
  state: GithubIssueState
}
