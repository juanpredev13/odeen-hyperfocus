import { computed } from 'vue'
import { useIntentions } from '@/modules/assistant/composables/useIntentions'
import type { Intention } from '@/modules/assistant/types'

let loadedFor: string | null = null
let pending: Promise<void> | null = null

/**
 * Today's and this week's intentions, offered as the optional intention a
 * task serves (#79). Reads the assistant's shared intentions state, so the
 * planner and the task form never fetch them twice.
 */
export function useTaskIntention() {
  const { intentions, load, listFor } = useIntentions()

  /** Loads once per calendar day; concurrent callers share one request. */
  async function ensureLoaded(): Promise<void> {
    const today = new Date().toDateString()
    if (loadedFor === today) return
    pending ??= load().then(() => {
      loadedFor = today
      pending = null
    })
    await pending
  }

  const todayOptions = computed<Intention[]>(() => listFor('day', new Date()))
  const weekOptions = computed<Intention[]>(() => listFor('week', new Date()))

  function findIntention(id: string | null): Intention | null {
    if (!id) return null
    return intentions.value.find((i) => i.id === id) ?? null
  }

  return { ensureLoaded, todayOptions, weekOptions, findIntention }
}
