import { ref } from 'vue'
import * as intentionsService from '@/modules/assistant/services/intentions.service'
import { fetchAllTasks } from '@/modules/tasks/services/tasks.service'
import {
  addDays,
  intentionsFor,
  nextFreePosition,
  rankSuggestions,
  storageDate,
} from '@/modules/assistant/composables/intentionHelpers'
import type { Task } from '@/modules/tasks/types'
import type {
  AssistantError,
  Intention,
  IntentionScope,
  UpdateIntentionPayload,
} from '@/modules/assistant/types'

export interface NewIntention {
  text: string
  task_id?: string | null
  when_text?: string | null
  where_text?: string | null
  first_action?: string | null
}

// Module-level state: the header bar and the planner share the same data.
const intentions = ref<Intention[]>([])
const tasks = ref<Task[]>([])
const loading = ref(false)
const error = ref<AssistantError | null>(null)

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function useIntentions() {
  /** Loads today's and tomorrow's intentions (day, personal and both weeks). */
  async function load(today: Date = new Date()): Promise<void> {
    loading.value = true
    error.value = null

    const tomorrow = addDays(today, 1)
    const dates = [
      ...new Set([
        storageDate('day', today),
        storageDate('day', tomorrow),
        storageDate('week', today),
        storageDate('week', tomorrow),
      ]),
    ]
    const result = await intentionsService.fetchIntentions(dates)

    loading.value = false
    if (result.error) {
      error.value = result.error
      return
    }

    intentions.value = result.data ?? []
  }

  async function loadTasks(): Promise<void> {
    const result = await fetchAllTasks()
    if (result.error) {
      error.value = result.error
      return
    }
    tasks.value = result.data ?? []
  }

  function listFor(scope: IntentionScope, day: Date): Intention[] {
    return intentionsFor(intentions.value, scope, day)
  }

  function suggestionsFor(scope: IntentionScope, day: Date): Task[] {
    const linked = listFor(scope, day)
      .map((i) => i.task_id)
      .filter((id): id is string => id !== null)
    return rankSuggestions(tasks.value, linked)
  }

  async function add(scope: IntentionScope, day: Date, input: NewIntention): Promise<boolean> {
    error.value = null

    const position = nextFreePosition(listFor(scope, day))
    if (position === null) {
      error.value = { message: `Up to ${intentionsService.MAX_INTENTIONS_PER_SCOPE} intentions per scope` }
      return false
    }

    const result = await intentionsService.createIntention({
      date: storageDate(scope, day),
      scope,
      position,
      task_id: input.task_id ?? null,
      text: input.text,
      when_text: emptyToNull(input.when_text),
      where_text: emptyToNull(input.where_text),
      first_action: emptyToNull(input.first_action),
    })

    if (result.error) {
      error.value = result.error
      return false
    }

    if (result.data) intentions.value.push(result.data)
    return true
  }

  async function update(payload: UpdateIntentionPayload): Promise<boolean> {
    error.value = null

    const result = await intentionsService.updateIntention(payload)

    if (result.error) {
      error.value = result.error
      return false
    }

    if (result.data) {
      const updated = result.data
      const index = intentions.value.findIndex((i) => i.id === updated.id)
      if (index !== -1) intentions.value[index] = updated
    }
    return true
  }

  async function toggleDone(intention: Intention): Promise<boolean> {
    return update({ id: intention.id, done: !intention.done })
  }

  async function remove(id: string): Promise<boolean> {
    error.value = null

    const result = await intentionsService.deleteIntention(id)

    if (result.error) {
      error.value = result.error
      return false
    }

    intentions.value = intentions.value.filter((i) => i.id !== id)
    return true
  }

  return {
    intentions,
    tasks,
    loading,
    error,
    load,
    loadTasks,
    listFor,
    suggestionsFor,
    add,
    update,
    toggleDone,
    remove,
  }
}
