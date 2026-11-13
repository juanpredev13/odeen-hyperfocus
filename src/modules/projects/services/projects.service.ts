import { supabase } from '@/services/supabase'
import type {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectSharing,
  ProjectsResult,
} from '@/modules/projects/types'

// Sharing rules (who sees an organization's projects, who may move a project
// into or out of one) are enforced by RLS and a trigger in
// supabase/migrations/20261113000001_share_projects_with_organizations.sql.

/** Every query returns the organization and client names alongside the row. */
const PROJECT_SELECT =
  '*, organization:organizations(id, name), client:clients!projects_client_same_organization(id, name)'

/** A client only makes sense inside an organization. */
function normalizeSharing(sharing: Partial<ProjectSharing>): Partial<ProjectSharing> {
  if (!('organization_id' in sharing) && !('client_id' in sharing)) return {}
  const organization_id = sharing.organization_id ?? null
  return { organization_id, client_id: organization_id ? (sharing.client_id ?? null) : null }
}

export async function fetchProjects(): Promise<ProjectsResult<Project[]>> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as unknown as Project[], error: null }
}

export async function createProject(
  payload: CreateProjectPayload,
): Promise<ProjectsResult<Project>> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { data: null, error: { message: 'Not authenticated' } }

  const name = payload.name.trim()
  if (!name) return { data: null, error: { message: 'Name is required' } }

  const { data, error } = await supabase
    .from('projects')
    .insert({ name, ...normalizeSharing(payload), user_id: user.id })
    .select(PROJECT_SELECT)
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as unknown as Project, error: null }
}

export async function updateProject(
  payload: UpdateProjectPayload,
): Promise<ProjectsResult<Project>> {
  const { id, name, ...sharing } = payload
  const fields: Partial<ProjectSharing> & { name?: string } = normalizeSharing(sharing)

  if (name !== undefined) {
    const trimmed = name.trim()
    if (!trimmed) return { data: null, error: { message: 'Name is required' } }
    fields.name = trimmed
  }

  const { data, error } = await supabase
    .from('projects')
    .update(fields)
    .eq('id', id)
    .select(PROJECT_SELECT)
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as unknown as Project, error: null }
}

export async function deleteProject(id: string): Promise<ProjectsResult<null>> {
  // RLS lets only the creator delete; a member's delete matches no row, so ask
  // for the deleted row to tell that apart from success.
  const { data, error } = await supabase.from('projects').delete().eq('id', id).select('id')

  if (error) return { data: null, error: { message: error.message } }
  if (!data || data.length === 0) {
    return { data: null, error: { message: 'Only the project’s creator can delete it' } }
  }

  return { data: null, error: null }
}
