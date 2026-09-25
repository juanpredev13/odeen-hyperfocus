import { computed, onUnmounted, ref, shallowRef } from 'vue'
import * as sessionsService from '@/modules/focus/services/sessions.service'
import {
  EXTEND_MINUTES,
  comfortableLength,
  elapsedMinutes,
  isStale,
  remainingSeconds,
  staleSessionEnd,
} from '@/modules/focus/composables/sessionHelpers'
import type { FocusError, FocusSession, SessionPhase } from '@/modules/focus/types'

// Module-level: QuickCapture reads the running session to tag captures with it.
const activeSession = ref<FocusSession | null>(null)

export function useActiveSessionId() {
  return computed(() => activeSession.value?.id ?? null)
}

export function useFocusSession(options: { onTimeUp?: () => void } = {}) {
  const phase = ref<SessionPhase>('setup')
  const recent = shallowRef<FocusSession[]>([])
  const finished = ref<FocusSession | null>(null)
  const capturesInSession = ref(0)
  /** Planned minutes plus every "keep going" extension. */
  const targetMinutes = ref(0)
  const now = ref(new Date())
  const error = ref<FocusError | null>(null)
  const busy = ref(false)

  let timer: ReturnType<typeof setInterval> | null = null

  const secondsLeft = computed(() =>
    activeSession.value ? remainingSeconds(activeSession.value.started_at, targetMinutes.value, now.value) : 0,
  )

  function tick(): void {
    now.value = new Date()
    if (phase.value === 'running' && secondsLeft.value <= 0) {
      phase.value = 'timeup'
      options.onTimeUp?.()
    }
  }

  function startTicking(): void {
    stopTicking()
    tick()
    // Recomputed from wall-clock time each tick, so throttled background tabs stay accurate.
    timer = setInterval(tick, 1000)
  }

  function stopTicking(): void {
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  function suggestedMinutes(fallback: number): number {
    return comfortableLength(recent.value, fallback)
  }

  /** Loads history and resumes (or closes) a session left running. */
  async function init(taskId: string): Promise<void> {
    error.value = null
    const [recentResult, activeResult] = await Promise.all([
      sessionsService.fetchRecentSessions(),
      sessionsService.fetchActiveSession(),
    ])
    if (recentResult.error) error.value = recentResult.error
    recent.value = recentResult.data ?? []

    const running = activeResult.data
    if (!running) return

    const target = running.planned_minutes + (running.extended ? EXTEND_MINUTES : 0)
    if (running.task_id === taskId && !isStale(running, target, new Date())) {
      activeSession.value = running
      targetMinutes.value = target
      phase.value = 'running'
      startTicking()
      return
    }

    // A different task, or abandoned long ago: close it so a new one can start.
    await sessionsService.updateSession(running.id, staleSessionEnd(running, new Date()))
  }

  async function start(taskId: string, minutes: number): Promise<boolean> {
    busy.value = true
    error.value = null
    const result = await sessionsService.startSession({
      task_id: taskId,
      mode: 'hyperfocus',
      planned_minutes: minutes,
    })
    busy.value = false

    if (result.error || !result.data) {
      error.value = result.error ?? { message: 'Could not start the session' }
      return false
    }

    activeSession.value = result.data
    targetMinutes.value = minutes
    finished.value = null
    phase.value = 'running'
    startTicking()
    return true
  }

  async function refocus(): Promise<void> {
    const session = activeSession.value
    if (!session) return
    const next = session.refocus_count + 1
    activeSession.value = { ...session, refocus_count: next }
    const result = await sessionsService.updateSession(session.id, { refocus_count: next })
    if (result.error) error.value = result.error
  }

  async function extend(): Promise<void> {
    const session = activeSession.value
    if (!session) return
    targetMinutes.value += EXTEND_MINUTES
    phase.value = 'running'
    if (!session.extended) {
      activeSession.value = { ...session, extended: true }
      const result = await sessionsService.updateSession(session.id, { extended: true })
      if (result.error) error.value = result.error
    }
  }

  /** Ends the running session and logs the actual minutes. */
  async function stop(): Promise<boolean> {
    const session = activeSession.value
    if (!session) return true
    stopTicking()
    busy.value = true

    const end = new Date()
    const result = await sessionsService.updateSession(session.id, {
      ended_at: end.toISOString(),
      actual_minutes: elapsedMinutes(session.started_at, end),
      refocus_count: session.refocus_count,
    })
    const captures = await sessionsService.countSessionCaptures(session.id)
    busy.value = false

    if (result.error || !result.data) {
      error.value = result.error ?? { message: 'Could not save the session' }
      startTicking()
      return false
    }

    finished.value = result.data
    capturesInSession.value = captures.data ?? 0
    recent.value = [result.data, ...recent.value]
    activeSession.value = null
    phase.value = 'done'
    return true
  }

  function reset(): void {
    finished.value = null
    phase.value = 'setup'
  }

  onUnmounted(stopTicking)

  return {
    phase,
    session: computed(() => activeSession.value),
    finished,
    capturesInSession,
    secondsLeft,
    targetMinutes,
    error,
    busy,
    init,
    start,
    refocus,
    extend,
    stop,
    reset,
    suggestedMinutes,
  }
}
