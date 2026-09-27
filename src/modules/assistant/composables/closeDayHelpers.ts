import type { FocusSession } from '@/modules/focus/types'
import type { Intention } from '@/modules/assistant/types'

/** Focus minutes that count as "real focus": finished hyperfocus sessions only. */
function focusedMinutes(session: FocusSession): number {
  if (session.mode !== 'hyperfocus' || session.actual_minutes === null) return 0
  return session.actual_minutes
}

export function totalFocusMinutes(sessions: readonly FocusSession[]): number {
  return sessions.reduce((sum, s) => sum + focusedMinutes(s), 0)
}

/** Finished hyperfocus minutes per task id. Sessions without a task are skipped. */
export function focusMinutesByTask(sessions: readonly FocusSession[]): Map<string, number> {
  const byTask = new Map<string, number>()
  for (const session of sessions) {
    if (session.task_id === null) continue
    const minutes = focusedMinutes(session)
    if (minutes === 0) continue
    byTask.set(session.task_id, (byTask.get(session.task_id) ?? 0) + minutes)
  }
  return byTask
}

/** 0 → "0m", 50 → "50m", 105 → "1h 45m", 120 → "2h". */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function normalize(text: string): string {
  return text.trim().toLowerCase()
}

/**
 * Whether `intention` already has a counterpart in tomorrow's list: same
 * linked task, or same text when neither is linked.
 */
export function isCarriedOver(intention: Intention, tomorrow: readonly Intention[]): boolean {
  return tomorrow.some((t) =>
    intention.task_id !== null
      ? t.task_id === intention.task_id
      : t.task_id === null && normalize(t.text) === normalize(intention.text),
  )
}

/** Local midnight of `day` and of the day after — the range sessions are fetched for. */
export function dayRange(day: Date): { from: Date; to: Date } {
  const from = new Date(day)
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  return { from, to }
}
