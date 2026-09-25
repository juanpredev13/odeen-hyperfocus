import type { FocusSession } from '@/modules/focus/types'

export const DURATION_PRESETS: readonly number[] = [15, 25, 45, 60]
export const MIN_SESSION_MINUTES = 5
export const MAX_SESSION_MINUTES = 180
export const EXTEND_MINUTES = 10
/** Sessions left running longer than planned + this are closed on the next visit. */
export const STALE_GRACE_MINUTES = 60

const MS_PER_MINUTE = 60_000

export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return MIN_SESSION_MINUTES
  return Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, Math.round(minutes)))
}

/** mm:ss, or h:mm:ss past an hour. Negative input shows 00:00. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function elapsedMinutes(startedAt: string, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - new Date(startedAt).getTime()) / MS_PER_MINUTE))
}

/** Seconds left until startedAt + targetMinutes (negative once over). */
export function remainingSeconds(startedAt: string, targetMinutes: number, now: Date): number {
  const end = new Date(startedAt).getTime() + targetMinutes * MS_PER_MINUTE
  return Math.ceil((end - now.getTime()) / 1000)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

/**
 * The length the user can comfortably focus for, from recent finished
 * hyperfocus sessions: sessions that ran to time (or were extended) count
 * at their planned length; sessions stopped early count at what was
 * actually done. Median of the last 5, rounded to 5 minutes.
 */
export function comfortableLength(
  sessions: readonly Pick<FocusSession, 'mode' | 'planned_minutes' | 'actual_minutes' | 'ended_at' | 'started_at' | 'extended'>[],
  fallback: number,
): number {
  const recent = sessions
    .filter((s) => s.mode === 'hyperfocus' && s.ended_at !== null && s.actual_minutes !== null)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, 5)
    .map((s) => {
      const actual = s.actual_minutes ?? 0
      return s.extended || actual >= s.planned_minutes ? s.planned_minutes : actual
    })
    .filter((m) => m > 0)

  if (recent.length === 0) return clampMinutes(fallback)
  return clampMinutes(Math.round(median(recent) / 5) * 5)
}

/**
 * Closes a session left running (e.g. tab closed): counts at most the
 * planned time, since nobody can confirm what happened after that.
 */
export function staleSessionEnd(
  session: Pick<FocusSession, 'started_at' | 'planned_minutes'>,
  now: Date,
): { ended_at: string; actual_minutes: number } {
  const plannedEnd = new Date(new Date(session.started_at).getTime() + session.planned_minutes * MS_PER_MINUTE)
  const end = plannedEnd < now ? plannedEnd : now
  return { ended_at: end.toISOString(), actual_minutes: elapsedMinutes(session.started_at, end) }
}

export function isStale(
  session: Pick<FocusSession, 'started_at' | 'planned_minutes'>,
  targetMinutes: number,
  now: Date,
): boolean {
  return remainingSeconds(session.started_at, targetMinutes + STALE_GRACE_MINUTES, now) <= 0
}

/** About 15 minutes of break per hour of focus, never under 5. */
export function suggestedBreakMinutes(focusedMinutes: number): number {
  return Math.max(5, Math.round((focusedMinutes / 60) * 15))
}

export function pickBreakActivity(activities: readonly string[], seed: number): string | null {
  if (activities.length === 0) return null
  const index = Math.abs(Math.floor(seed)) % activities.length
  return activities[index] ?? null
}
