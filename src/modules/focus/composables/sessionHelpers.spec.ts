import { describe, expect, it } from 'vitest'
import {
  clampMinutes,
  comfortableLength,
  elapsedMinutes,
  formatClock,
  isStale,
  pickBreakActivity,
  remainingSeconds,
  staleSessionEnd,
  suggestedBreakMinutes,
} from '@/modules/focus/composables/sessionHelpers'
import type { FocusSession } from '@/modules/focus/types'

function session(partial: Partial<FocusSession>): FocusSession {
  return {
    id: 's',
    user_id: 'u',
    task_id: null,
    mode: 'hyperfocus',
    planned_minutes: 25,
    actual_minutes: 25,
    started_at: '2026-09-25T10:00:00Z',
    ended_at: '2026-09-25T10:25:00Z',
    refocus_count: 0,
    extended: false,
    notes: null,
    created_at: '2026-09-25T10:00:00Z',
    ...partial,
  }
}

describe('clampMinutes', () => {
  it.each([
    [0, 5],
    [3, 5],
    [22.4, 22],
    [500, 180],
    [Number.NaN, 5],
  ])('%s → %s', (input, expected) => {
    expect(clampMinutes(input)).toBe(expected)
  })
})

describe('formatClock', () => {
  it.each([
    [0, '00:00'],
    [59, '00:59'],
    [25 * 60, '25:00'],
    [3661, '1:01:01'],
    [-5, '00:00'],
  ])('%s s → %s', (s, expected) => {
    expect(formatClock(s)).toBe(expected)
  })
})

describe('time math', () => {
  const start = '2026-09-25T10:00:00Z'

  it('elapsedMinutes rounds and never goes negative', () => {
    expect(elapsedMinutes(start, new Date('2026-09-25T10:24:40Z'))).toBe(25)
    expect(elapsedMinutes(start, new Date('2026-09-25T09:59:00Z'))).toBe(0)
  })

  it('remainingSeconds counts down and goes negative once over', () => {
    expect(remainingSeconds(start, 25, new Date('2026-09-25T10:24:00Z'))).toBe(60)
    expect(remainingSeconds(start, 25, new Date('2026-09-25T10:26:00Z'))).toBe(-60)
  })
})

describe('comfortableLength', () => {
  it('falls back when there is no history', () => {
    expect(comfortableLength([], 15)).toBe(15)
  })

  it('uses planned length for sessions that ran to time or were extended', () => {
    const sessions = [
      session({ planned_minutes: 25, actual_minutes: 25 }),
      session({ planned_minutes: 45, actual_minutes: 60, extended: true, started_at: '2026-09-25T12:00:00Z' }),
      session({ planned_minutes: 25, actual_minutes: 26, started_at: '2026-09-25T14:00:00Z' }),
    ]
    expect(comfortableLength(sessions, 15)).toBe(25)
  })

  it('uses actual time for sessions stopped early', () => {
    const sessions = [
      session({ planned_minutes: 45, actual_minutes: 12 }),
      session({ planned_minutes: 45, actual_minutes: 18, started_at: '2026-09-25T11:00:00Z' }),
      session({ planned_minutes: 45, actual_minutes: 20, started_at: '2026-09-25T12:00:00Z' }),
    ]
    expect(comfortableLength(sessions, 15)).toBe(20)
  })

  it('only looks at the 5 most recent finished hyperfocus sessions', () => {
    const old = Array.from({ length: 5 }, (_, i) =>
      session({ planned_minutes: 60, actual_minutes: 60, started_at: `2026-09-2${i}T08:00:00Z` }),
    )
    const recent = Array.from({ length: 5 }, (_, i) =>
      session({ planned_minutes: 15, actual_minutes: 15, started_at: `2026-09-25T1${i}:00:00Z` }),
    )
    const ignored = [
      session({ mode: 'break', planned_minutes: 90, actual_minutes: 90, started_at: '2026-09-26T00:00:00Z' }),
      session({ ended_at: null, actual_minutes: null, planned_minutes: 90, started_at: '2026-09-26T01:00:00Z' }),
    ]
    expect(comfortableLength([...old, ...recent, ...ignored], 30)).toBe(15)
  })
})

describe('stale sessions', () => {
  const s = { started_at: '2026-09-25T10:00:00Z', planned_minutes: 25 }

  it('isStale only after planned + grace period', () => {
    expect(isStale(s, 25, new Date('2026-09-25T11:00:00Z'))).toBe(false)
    expect(isStale(s, 25, new Date('2026-09-25T11:30:00Z'))).toBe(true)
  })

  it('staleSessionEnd caps actual time at the planned length', () => {
    expect(staleSessionEnd(s, new Date('2026-09-25T13:00:00Z'))).toEqual({
      ended_at: '2026-09-25T10:25:00.000Z',
      actual_minutes: 25,
    })
  })

  it('staleSessionEnd uses now when still inside the planned time', () => {
    expect(staleSessionEnd(s, new Date('2026-09-25T10:10:00Z')).actual_minutes).toBe(10)
  })
})

describe('breaks', () => {
  it.each([
    [10, 5],
    [25, 6],
    [60, 15],
    [90, 23],
  ])('%s min focus → %s min break', (focus, expected) => {
    expect(suggestedBreakMinutes(focus)).toBe(expected)
  })

  it('pickBreakActivity is deterministic for a seed and handles empty lists', () => {
    expect(pickBreakActivity(['a', 'b', 'c'], 4)).toBe('b')
    expect(pickBreakActivity([], 1)).toBeNull()
  })
})
