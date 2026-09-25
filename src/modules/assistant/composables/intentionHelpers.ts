import { getTaskQuadrant } from '@/modules/tasks/composables/useTaskQuadrant'
import type { Task, TaskQuadrant } from '@/modules/tasks/types'
import type {
  Intention,
  IntentionPosition,
  IntentionScope,
} from '@/modules/assistant/types'

const POSITIONS: readonly IntentionPosition[] = [1, 2, 3]

/** Local-time ISO date (YYYY-MM-DD), never UTC-shifted. */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parses YYYY-MM-DD as a local date at midnight. */
export function fromISODate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) throw new Error(`Invalid ISO date: ${iso}`)
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Monday of the ISO week containing `date`. */
export function weekStart(date: Date): Date {
  const day = date.getDay() // 0 = Sunday
  const offset = day === 0 ? -6 : 1 - day
  const monday = addDays(date, offset)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/** The date an intention of `scope` is stored under for the given day. */
export function storageDate(scope: IntentionScope, day: Date): string {
  return toISODate(scope === 'week' ? weekStart(day) : day)
}

export function intentionsFor(
  intentions: readonly Intention[],
  scope: IntentionScope,
  day: Date,
): Intention[] {
  const date = storageDate(scope, day)
  return intentions
    .filter((i) => i.scope === scope && i.date === date)
    .sort((a, b) => a.position - b.position)
}

/** First free slot (1–3) or null when all three are taken. */
export function nextFreePosition(existing: readonly Pick<Intention, 'position'>[]): IntentionPosition | null {
  const taken = new Set(existing.map((i) => i.position))
  return POSITIONS.find((p) => !taken.has(p)) ?? null
}

const QUADRANT_RANK: Record<TaskQuadrant, number> = {
  purposeful: 0,
  necessary: 1,
  distracting: 2,
  unnecessary: 3,
}

/**
 * Candidate tasks for intentions: open, productive tasks (necessary or
 * purposeful) not already linked, ranked by impact, then quadrant, then age.
 */
export function rankSuggestions(
  tasks: readonly Task[],
  excludeTaskIds: readonly string[] = [],
  limit = 5,
): Task[] {
  const excluded = new Set(excludeTaskIds)
  return tasks
    .filter((t) => t.status !== 'done' && !excluded.has(t.id))
    .filter((t) => {
      const q = getTaskQuadrant(t)
      return q === 'purposeful' || q === 'necessary'
    })
    .sort(
      (a, b) =>
        b.impact_score - a.impact_score ||
        QUADRANT_RANK[getTaskQuadrant(a)] - QUADRANT_RANK[getTaskQuadrant(b)] ||
        a.created_at.localeCompare(b.created_at),
    )
    .slice(0, limit)
}

export interface DayProgress {
  done: number
  total: number
}

export function progress(intentions: readonly Pick<Intention, 'done'>[]): DayProgress {
  return { done: intentions.filter((i) => i.done).length, total: intentions.length }
}
