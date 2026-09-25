import { computed, ref } from 'vue'
import * as checkinsService from '@/modules/assistant/services/checkins.service'
import { latest, onLocalDay, summarize } from '@/modules/assistant/composables/checkinHelpers'
import type { AssistantError, AwarenessCheckin, CheckinAnswers } from '@/modules/assistant/types'

const STORAGE_PREFIX = 'odeen-checkin-last:'

// Module-level: the prompt (app root) and the Today card share this state.
const checkins = ref<AwarenessCheckin[]>([])
const promptOpen = ref(false)
const lastShownAt = ref<Date | null>(null)
const error = ref<AssistantError | null>(null)
let storageKey: string | null = null

function readStored(key: string): Date | null {
  try {
    const raw = window.localStorage.getItem(key)
    const date = raw ? new Date(raw) : null
    return date && !Number.isNaN(date.getTime()) ? date : null
  } catch {
    return null
  }
}

function writeStored(date: Date): void {
  if (!storageKey) return
  try {
    window.localStorage.setItem(storageKey, date.toISOString())
  } catch {
    // Private mode / storage disabled: scheduling still works for this tab.
  }
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function useCheckins() {
  const today = computed(() => onLocalDay(checkins.value, new Date()))
  const todaySummary = computed(() => summarize(today.value))
  /** Last check-in or last prompt shown/dismissed — whichever is later. */
  const lastActivityAt = computed(() => {
    const last = checkins.value[0]
    return latest(last ? new Date(last.at) : null, lastShownAt.value)
  })

  /** Loads today's check-ins and the per-user "last prompt" marker. */
  async function load(userId: string): Promise<void> {
    storageKey = `${STORAGE_PREFIX}${userId}`
    lastShownAt.value = readStored(storageKey)

    const result = await checkinsService.fetchCheckinsSince(startOfLocalDay(new Date()).toISOString())
    if (result.error) {
      error.value = result.error
      return
    }
    checkins.value = result.data ?? []
  }

  function open(): void {
    if (promptOpen.value) return
    const now = new Date()
    lastShownAt.value = now
    writeStored(now)
    promptOpen.value = true
  }

  function dismiss(): void {
    const now = new Date()
    lastShownAt.value = now
    writeStored(now)
    promptOpen.value = false
  }

  async function save(answers: CheckinAnswers): Promise<boolean> {
    error.value = null
    const result = await checkinsService.createCheckin(answers)
    if (result.error || !result.data) {
      error.value = result.error ?? { message: 'Could not save the check-in' }
      return false
    }
    checkins.value = [result.data, ...checkins.value]
    dismiss()
    return true
  }

  return {
    checkins,
    today,
    todaySummary,
    promptOpen,
    lastActivityAt,
    error,
    load,
    open,
    dismiss,
    save,
  }
}
