import { computed, ref } from 'vue'
import * as capturesService from '@/modules/assistant/services/captures.service'
import { byStatus, parseQuickCapture, pinnedProblems } from '@/modules/assistant/composables/captureHelpers'
import type { AssistantError, AssistantResult, Capture, CaptureKind } from '@/modules/assistant/types'

// Module-level state: quick capture, the inbox view and the Today card share it.
const captures = ref<Capture[]>([])
const loaded = ref(false)
const loading = ref(false)
const error = ref<AssistantError | null>(null)

function replace(updated: Capture): void {
  const index = captures.value.findIndex((c) => c.id === updated.id)
  if (index !== -1) captures.value[index] = updated
}

export function useCaptures() {
  const inbox = computed(() => byStatus(captures.value, 'inbox'))
  const processed = computed(() =>
    [...byStatus(captures.value, 'converted'), ...byStatus(captures.value, 'archived')].sort((a, b) =>
      (b.processed_at ?? '').localeCompare(a.processed_at ?? ''),
    ),
  )
  const pinned = computed(() => pinnedProblems(captures.value))
  const inboxCount = computed(() => inbox.value.length)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null

    const result = await capturesService.fetchCaptures()

    loading.value = false
    if (result.error) {
      error.value = result.error
      return
    }

    captures.value = result.data ?? []
    loaded.value = true
  }

  /** Parses the quick-capture syntax ("idea: …") and saves it. */
  async function capture(
    input: string,
    fallbackKind?: CaptureKind,
    sessionId: string | null = null,
  ): Promise<Capture | null> {
    error.value = null

    const { kind, text } = parseQuickCapture(input, fallbackKind)
    const result = await capturesService.createCapture({ kind, text, session_id: sessionId })

    if (result.error) {
      error.value = result.error
      return null
    }

    if (result.data) captures.value.unshift(result.data)
    return result.data
  }

  async function run(action: Promise<AssistantResult<Capture>>): Promise<boolean> {
    error.value = null
    const result = await action
    if (result.error) {
      error.value = result.error
      return false
    }
    if (result.data) replace(result.data)
    return true
  }

  const setKind = (id: string, kind: CaptureKind): Promise<boolean> =>
    run(capturesService.updateCaptureKind(id, kind))
  const setText = (id: string, text: string): Promise<boolean> =>
    run(capturesService.updateCaptureText(id, text))
  const togglePin = (c: Capture): Promise<boolean> => run(capturesService.setPinned(c.id, !c.pinned))
  const archive = (id: string): Promise<boolean> => run(capturesService.archiveCapture(id))
  const restore = (id: string): Promise<boolean> => run(capturesService.restoreCapture(id))
  const attach = (id: string, taskId: string): Promise<boolean> =>
    run(capturesService.attachToTask(id, taskId))

  async function convert(id: string, projectId: string): Promise<boolean> {
    error.value = null
    const result = await capturesService.convertToTask(id, projectId)
    if (result.error || !result.data) {
      error.value = result.error ?? { message: 'Conversion failed' }
      return false
    }
    const task = result.data
    const current = captures.value.find((c) => c.id === id)
    if (current) {
      replace({
        ...current,
        status: 'converted',
        task_id: task.id,
        pinned: false,
        processed_at: new Date().toISOString(),
      })
    }
    return true
  }

  async function remove(id: string): Promise<boolean> {
    error.value = null
    const result = await capturesService.deleteCapture(id)
    if (result.error) {
      error.value = result.error
      return false
    }
    captures.value = captures.value.filter((c) => c.id !== id)
    return true
  }

  return {
    captures,
    inbox,
    processed,
    pinned,
    inboxCount,
    loaded,
    loading,
    error,
    load,
    capture,
    setKind,
    setText,
    togglePin,
    archive,
    restore,
    attach,
    convert,
    remove,
  }
}
