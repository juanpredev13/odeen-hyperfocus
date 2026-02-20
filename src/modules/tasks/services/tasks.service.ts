import { supabase } from '@/services/supabase'
import type {
  Task,
  TaskStatus,
  CreateTaskPayload,
  UpdateTaskPayload,
  TasksResult,
} from '@/modules/tasks/types'

export async function fetchTasks(projectId: string): Promise<TasksResult<Task[]>> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Task[], error: null }
}

export async function fetchTask(id: string): Promise<TasksResult<Task>> {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Task, error: null }
}

export async function fetchAllTasks(): Promise<TasksResult<Task[]>> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Task[], error: null }
}

export async function createTask(payload: CreateTaskPayload): Promise<TasksResult<Task>> {
  const { data, error } = await supabase.from('tasks').insert(payload).select().single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Task, error: null }
}

export async function updateTask(payload: UpdateTaskPayload): Promise<TasksResult<Task>> {
  const { id, ...fields } = payload

  const { data, error } = await supabase.from('tasks').update(fields).eq('id', id).select().single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Task, error: null }
}

export async function deleteTask(id: string): Promise<TasksResult<null>> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)

  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}

export async function updateStatus(id: string, status: TaskStatus): Promise<TasksResult<Task>> {
  return updateTask({ id, status })
}

export async function updatePosition(id: string, x: number, y: number): Promise<TasksResult<Task>> {
  return updateTask({ id, position_x: x, position_y: y })
}
