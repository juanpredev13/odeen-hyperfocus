export interface ProjectRef {
  id: string
  name: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  /** null for a personal project; set when it is shared with an organization. */
  organization_id: string | null
  /** Optional client of that organization. */
  client_id: string | null
  created_at: string
  organization: ProjectRef | null
  client: ProjectRef | null
}

/** Where a project lives: personal (both null) or an organization, optionally for one of its clients. */
export interface ProjectSharing {
  organization_id: string | null
  client_id: string | null
}

export interface CreateProjectPayload extends Partial<ProjectSharing> {
  name: string
}

export interface UpdateProjectPayload extends Partial<ProjectSharing> {
  id: string
  name?: string
}

export interface ProjectsError {
  message: string
}

export interface ProjectsResult<T> {
  data: T | null
  error: ProjectsError | null
}
