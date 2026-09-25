import { describe, expect, it } from 'vitest'
import {
  addDays,
  fromISODate,
  intentionsFor,
  nextFreePosition,
  progress,
  rankSuggestions,
  storageDate,
  toISODate,
  weekStart,
} from '@/modules/assistant/composables/intentionHelpers'
import type { Intention } from '@/modules/assistant/types'
import type { ImpactScore, Task, TaskStatus } from '@/modules/tasks/types'

function task(
  id: string,
  impact: ImpactScore,
  attractive: boolean,
  status: TaskStatus = 'todo',
  created = '2026-09-01T00:00:00Z',
): Task {
  return {
    id,
    project_id: 'p',
    title: id,
    description: null,
    status,
    energy_level: 1,
    impact_score: impact,
    is_attractive: attractive,
    position_x: null,
    position_y: null,
    created_at: created,
  }
}

function intention(partial: Partial<Intention>): Intention {
  return {
    id: 'i',
    user_id: 'u',
    date: '2026-09-25',
    scope: 'day',
    position: 1,
    task_id: null,
    text: 'x',
    when_text: null,
    where_text: null,
    first_action: null,
    done: false,
    created_at: '2026-09-25T08:00:00Z',
    ...partial,
  }
}

describe('dates', () => {
  it('toISODate uses local time and pads', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('fromISODate round-trips', () => {
    expect(toISODate(fromISODate('2026-09-25'))).toBe('2026-09-25')
  })

  it('fromISODate rejects malformed input', () => {
    expect(() => fromISODate('2026-9-25')).toThrow('Invalid ISO date')
  })

  it('addDays crosses month boundaries', () => {
    expect(toISODate(addDays(fromISODate('2026-09-30'), 1))).toBe('2026-10-01')
  })

  it.each([
    ['2026-09-21', '2026-09-21'], // Monday
    ['2026-09-25', '2026-09-21'], // Friday
    ['2026-09-27', '2026-09-21'], // Sunday belongs to the week that started Monday
    ['2026-10-01', '2026-09-28'], // Thursday next week
  ])('weekStart(%s) = %s', (day, monday) => {
    expect(toISODate(weekStart(fromISODate(day)))).toBe(monday)
  })

  it('storageDate uses Monday for week scope, the day otherwise', () => {
    const friday = fromISODate('2026-09-25')
    expect(storageDate('week', friday)).toBe('2026-09-21')
    expect(storageDate('day', friday)).toBe('2026-09-25')
    expect(storageDate('personal', friday)).toBe('2026-09-25')
  })
})

describe('intentionsFor', () => {
  it('filters by scope and storage date, sorted by position', () => {
    const all = [
      intention({ id: 'a', position: 2 }),
      intention({ id: 'b', position: 1 }),
      intention({ id: 'c', scope: 'personal' }),
      intention({ id: 'd', date: '2026-09-24' }),
      intention({ id: 'w', scope: 'week', date: '2026-09-21' }),
    ]
    const friday = fromISODate('2026-09-25')
    expect(intentionsFor(all, 'day', friday).map((i) => i.id)).toEqual(['b', 'a'])
    expect(intentionsFor(all, 'week', friday).map((i) => i.id)).toEqual(['w'])
  })
})

describe('nextFreePosition', () => {
  it('returns 1 when empty', () => {
    expect(nextFreePosition([])).toBe(1)
  })

  it('fills gaps first', () => {
    expect(nextFreePosition([{ position: 1 }, { position: 3 }])).toBe(2)
  })

  it('returns null when all three slots are taken (Rule of 3)', () => {
    expect(nextFreePosition([{ position: 1 }, { position: 2 }, { position: 3 }])).toBeNull()
  })
})

describe('rankSuggestions', () => {
  const tasks = [
    task('low-distracting', 1, true),
    task('necessary-4', 4, false),
    task('purposeful-4', 4, true),
    task('purposeful-5-done', 5, true, 'done'),
    task('necessary-3-old', 3, false, 'todo', '2026-08-01T00:00:00Z'),
    task('necessary-3-new', 3, false, 'doing', '2026-09-10T00:00:00Z'),
    task('unnecessary', 2, false),
  ]

  it('keeps only open productive tasks, ranked by impact, quadrant, age', () => {
    expect(rankSuggestions(tasks).map((t) => t.id)).toEqual([
      'purposeful-4',
      'necessary-4',
      'necessary-3-old',
      'necessary-3-new',
    ])
  })

  it('excludes tasks already linked to an intention', () => {
    expect(rankSuggestions(tasks, ['purposeful-4']).map((t) => t.id)[0]).toBe('necessary-4')
  })

  it('respects the limit', () => {
    expect(rankSuggestions(tasks, [], 2)).toHaveLength(2)
  })
})

describe('progress', () => {
  it('counts done over total', () => {
    expect(progress([{ done: true }, { done: false }, { done: true }])).toEqual({ done: 2, total: 3 })
  })
})
