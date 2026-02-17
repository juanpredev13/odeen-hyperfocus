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
  position_x: number | null
  position_y: number | null
  created_at: string
}

export type CreateTaskPayload = Pick<
  Task,
  'project_id' | 'title' | 'description' | 'status' | 'energy_level' | 'impact_score'
>

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
