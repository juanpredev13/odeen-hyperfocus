import { computed, ref, shallowRef } from 'vue'
import { fetchSessionsBetween } from '@/modules/focus/services/sessions.service'
import { addDays } from '@/modules/assistant/composables/intentionHelpers'
import { useSchedule } from '@/modules/assistant/composables/useSchedule'
import {
  focusedMinutesBySegment,
  plannedMinutesBySegment,
  weekDates,
} from '@/modules/assistant/composables/scheduleHelpers'
import type { FocusSession } from '@/modules/focus/types'
import type { AssistantError, ScheduleSegment } from '@/modules/assistant/types'

export interface SegmentBalanceRow {
  segment: ScheduleSegment
  plannedMinutes: number
  focusedMinutes: number
}

/** Planned (schedule) vs focused (tagged focus sessions) minutes per segment for one week. */
export function useSegmentBalance(day: Date = new Date()) {
  const schedule = useSchedule()
  const sessions = shallowRef<FocusSession[]>([])
  const error = ref<AssistantError | null>(null)
  const days = weekDates(day)

  async function load(): Promise<void> {
    error.value = null
    const from = days[0] as Date
    const [, result] = await Promise.all([schedule.load(day), fetchSessionsBetween(from, addDays(from, 7))])
    if (result.error) {
      error.value = result.error
      return
    }
    sessions.value = result.data ?? []
  }

  const planned = computed(() =>
    plannedMinutesBySegment(schedule.blocks.value, schedule.overriddenDates.value, days),
  )
  const focused = computed(() => focusedMinutesBySegment(sessions.value))

  const rows = computed<SegmentBalanceRow[]>(() =>
    schedule.activeSegments.value.map((segment) => ({
      segment,
      plannedMinutes: planned.value.get(segment.id) ?? 0,
      focusedMinutes: focused.value.get(segment.id) ?? 0,
    })),
  )

  const totalPlanned = computed(() => rows.value.reduce((sum, r) => sum + r.plannedMinutes, 0))
  const totalFocused = computed(() => rows.value.reduce((sum, r) => sum + r.focusedMinutes, 0))

  return {
    days,
    rows,
    totalPlanned,
    totalFocused,
    loaded: schedule.loaded,
    error: computed(() => error.value ?? schedule.error.value),
    load,
  }
}
