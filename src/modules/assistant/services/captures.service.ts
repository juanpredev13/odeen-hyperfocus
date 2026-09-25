import { supabase } from '@/services/supabase'
import { isValidCaptureText, MAX_CAPTURE_LENGTH } from '@/modules/assistant/composables/captureHelpers'
import type { Task } from '@/modules/tasks/types'
import type {
  AssistantResult,
  Capture,
  CaptureKind,
  CreateCapturePayload,
} from '@/modules/assistant/types'

function invalidText(): AssistantResult<never> {
  return { data: null, error: { message: `Capture must be 1–${MAX_CAPTURE_LENGTH} characters` } }
}

export async function fetchCaptures(): Promise<AssistantResult<Capture[]>> {
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Capture[], error: null }
}

/** Pinned `problem` captures still in the inbox — used by problem-crunching sessions (#34). */
export async function fetchPinnedProblems(): Promise<AssistantResult<Capture[]>> {
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .eq('status', 'inbox')
    .eq('kind', 'problem')
    .eq('pinned', true)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Capture[], error: null }
}

export async function createCapture(payload: CreateCapturePayload): Promise<AssistantResult<Capture>> {
  if (!isValidCaptureText(payload.text)) return invalidText()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { data: null, error: { message: 'Not authenticated' } }

  const { data, error } = await supabase
    .from('captures')
    .insert({ ...payload, text: payload.text.trim(), user_id: user.id })
    .select()
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Capture, error: null }
}

async function patch(id: string, fields: Partial<Capture>): Promise<AssistantResult<Capture>> {
  const { data, error } = await supabase
    .from('captures')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Capture, error: null }
}

export async function updateCaptureText(id: string, text: string): Promise<AssistantResult<Capture>> {
  if (!isValidCaptureText(text)) return invalidText()
  return patch(id, { text: text.trim() })
}

/** Changing away from `problem` also unpins (DB check: only problems can be pinned). */
export async function updateCaptureKind(id: string, kind: CaptureKind): Promise<AssistantResult<Capture>> {
  return patch(id, kind === 'problem' ? { kind } : { kind, pinned: false })
}

export async function setPinned(id: string, pinned: boolean): Promise<AssistantResult<Capture>> {
  return patch(id, { pinned })
}

export async function archiveCapture(id: string): Promise<AssistantResult<Capture>> {
  return patch(id, { status: 'archived', pinned: false, processed_at: new Date().toISOString() })
}

export async function restoreCapture(id: string): Promise<AssistantResult<Capture>> {
  return patch(id, { status: 'inbox', task_id: null, processed_at: null })
}

export async function deleteCapture(id: string): Promise<AssistantResult<null>> {
  const { error } = await supabase.from('captures').delete().eq('id', id)

  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}

/** Atomic: creates the task and marks the capture converted (see migration). */
export async function convertToTask(
  captureId: string,
  projectId: string,
): Promise<AssistantResult<Task>> {
  const { data, error } = await supabase.rpc('convert_capture_to_task', {
    p_capture_id: captureId,
    p_project_id: projectId,
  })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Task, error: null }
}

/** Atomic: appends the capture to the task description and marks it converted. */
export async function attachToTask(
  captureId: string,
  taskId: string,
): Promise<AssistantResult<Capture>> {
  const { data, error } = await supabase.rpc('attach_capture_to_task', {
    p_capture_id: captureId,
    p_task_id: taskId,
  })

  if (error) return { data: null, error: { message: error.message } }

  return { data: data as Capture, error: null }
}
