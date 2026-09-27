import { computed, ref, shallowRef } from 'vue'
import { fetchSessionsBetween } from '@/modules/focus/services/sessions.service'
import {
  dayRange,
  focusMinutesByTask,
  totalFocusMinutes,
} from '@/modules/assistant/composables/closeDayHelpers'
import type { FocusSession } from '@/modules/focus/types'
import type { AssistantError } from '@/modules/assistant/types'

/** Focus sessions of one day, summarised for the end-of-day ritual. */
export function useDayFocus() {
  const sessions = shallowRef<FocusSession[]>([])
  const loading = ref(false)
  const error = ref<AssistantError | null>(null)

  async function load(day: Date = new Date()): Promise<void> {
    loading.value = true
    error.value = null

    const { from, to } = dayRange(day)
    const result = await fetchSessionsBetween(from, to)

    loading.value = false
    if (result.error) {
      error.value = result.error
      return
    }
    sessions.value = result.data ?? []
  }

  const totalMinutes = computed(() => totalFocusMinutes(sessions.value))
  const minutesByTask = computed(() => focusMinutesByTask(sessions.value))

  function minutesFor(taskId: string | null): number {
    return taskId === null ? 0 : (minutesByTask.value.get(taskId) ?? 0)
  }

  return { sessions, loading, error, load, totalMinutes, minutesFor }
}
