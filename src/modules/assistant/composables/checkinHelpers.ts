import type {
  AwarenessCheckin,
  CheckinAnswers,
  CheckinInterval,
} from '@/modules/assistant/types'

const MS_PER_MINUTE = 60_000

export const CHECKIN_INTERVALS: readonly { value: CheckinInterval; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 60, label: 'Every 60 min' },
  { value: 90, label: 'Every 90 min' },
]

export const EMPTY_ANSWERS: CheckinAnswers = {
  intentional: null,
  on_consequential: null,
  space_fullness: null,
  energy: null,
}

export function hasAnswer(answers: CheckinAnswers): boolean {
  return Object.values(answers).some((v) => v !== null)
}

/**
 * When the next prompt is due. `lastAt` is the later of the last saved
 * check-in and the last time a prompt was shown or dismissed. With no
 * history the first prompt waits a full interval from `since` (app open).
 */
export function nextDueAt(
  interval: CheckinInterval,
  lastAt: Date | null,
  since: Date,
): Date | null {
  if (interval === 0) return null
  const base = lastAt ?? since
  return new Date(base.getTime() + interval * MS_PER_MINUTE)
}

export function isDue(
  interval: CheckinInterval,
  lastAt: Date | null,
  since: Date,
  now: Date,
  sessionRunning: boolean,
): boolean {
  if (sessionRunning) return false
  const due = nextDueAt(interval, lastAt, since)
  return due !== null && now.getTime() >= due.getTime()
}

export function latest(...dates: (Date | null)[]): Date | null {
  return dates.reduce<Date | null>((acc, d) => (d && (!acc || d > acc) ? d : acc), null)
}

export interface CheckinSummary {
  count: number
  /** Share of answered "intentional" questions that were yes, 0–100, or null. */
  intentionalPercent: number | null
  lastEnergy: number | null
}

export function summarize(checkins: readonly AwarenessCheckin[]): CheckinSummary {
  const answered = checkins.filter((c) => c.intentional !== null)
  const yes = answered.filter((c) => c.intentional === true).length
  const withEnergy = [...checkins]
    .filter((c) => c.energy !== null)
    .sort((a, b) => b.at.localeCompare(a.at))
  return {
    count: checkins.length,
    intentionalPercent: answered.length ? Math.round((yes / answered.length) * 100) : null,
    lastEnergy: withEnergy[0]?.energy ?? null,
  }
}

/** Check-ins that happened on the local calendar day of `day`. */
export function onLocalDay(checkins: readonly AwarenessCheckin[], day: Date): AwarenessCheckin[] {
  return checkins.filter((c) => {
    const at = new Date(c.at)
    return (
      at.getFullYear() === day.getFullYear() &&
      at.getMonth() === day.getMonth() &&
      at.getDate() === day.getDate()
    )
  })
}
