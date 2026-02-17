export interface Project {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type CreateProjectPayload = Pick<Project, 'name'>
export type UpdateProjectPayload = Pick<Project, 'id' | 'name'>

export interface ProjectsError {
  message: string
}

export interface ProjectsResult<T> {
  data: T | null
  error: ProjectsError | null
}
