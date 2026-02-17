import { supabase } from '@/services/supabase'
import type {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectsResult,
} from '@/modules/projects/types'

export async function fetchProjects(): Promise<ProjectsResult<Project[]>> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Project[], error: null }
}

export async function createProject(
  payload: CreateProjectPayload,
): Promise<ProjectsResult<Project>> {
  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Project, error: null }
}

export async function updateProject(
  payload: UpdateProjectPayload,
): Promise<ProjectsResult<Project>> {
  const { id, ...fields } = payload

  const { data, error } = await supabase
    .from('projects')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Project, error: null }
}

export async function deleteProject(id: string): Promise<ProjectsResult<null>> {
  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}
