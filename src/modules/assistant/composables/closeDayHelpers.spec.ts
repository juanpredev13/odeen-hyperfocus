import { describe, expect, it } from 'vitest'
import {
  dayRange,
  focusMinutesByTask,
  formatDuration,
  isCarriedOver,
  totalFocusMinutes,
} from '@/modules/assistant/composables/closeDayHelpers'
import type { FocusSession } from '@/modules/focus/types'
import type { Intention } from '@/modules/assistant/types'

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

function intention(partial: Partial<Intention>): Intention {
  return {
    id: 'i',
    user_id: 'u',
    date: '2026-09-25',
    scope: 'day',
    position: 1,
    task_id: null,
    text: 'Write the report',
    when_text: null,
    where_text: null,
    first_action: null,
    done: false,
    created_at: '2026-09-25T08:00:00Z',
    ...partial,
  }
}

describe('totalFocusMinutes', () => {
  it('sums finished hyperfocus sessions only', () => {
    const sessions = [
      session({ actual_minutes: 60 }),
      session({ actual_minutes: 45, task_id: 't1' }),
      session({ mode: 'break', actual_minutes: 15 }),
      session({ actual_minutes: null, ended_at: null }),
    ]
    expect(totalFocusMinutes(sessions)).toBe(105)
  })

  it('is 0 with no sessions', () => {
    expect(totalFocusMinutes([])).toBe(0)
  })
})

describe('focusMinutesByTask', () => {
  it('groups minutes by task and skips unlinked, running and non-focus sessions', () => {
    const byTask = focusMinutesByTask([
      session({ task_id: 't1', actual_minutes: 60 }),
      session({ task_id: 't1', actual_minutes: 45 }),
      session({ task_id: 't2', actual_minutes: 50 }),
      session({ task_id: null, actual_minutes: 30 }),
      session({ task_id: 't2', actual_minutes: null, ended_at: null }),
      session({ task_id: 't3', mode: 'scatter_capture', actual_minutes: 20 }),
    ])
    expect(byTask.get('t1')).toBe(105)
    expect(byTask.get('t2')).toBe(50)
    expect(byTask.has('t3')).toBe(false)
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0m'],
    [50, '50m'],
    [60, '1h'],
    [105, '1h 45m'],
    [-5, '0m'],
    [49.6, '50m'],
  ])('%s → %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected)
  })
})

describe('isCarriedOver', () => {
  it('matches by linked task', () => {
    const today = intention({ task_id: 't1', text: 'Ship it' })
    expect(isCarriedOver(today, [intention({ task_id: 't1', text: 'Different text' })])).toBe(true)
    expect(isCarriedOver(today, [intention({ task_id: 't2', text: 'Ship it' })])).toBe(false)
  })

  it('matches unlinked intentions by normalised text', () => {
    const today = intention({ text: 'Walk 30 minutes' })
    expect(isCarriedOver(today, [intention({ text: '  walk 30 MINUTES ' })])).toBe(true)
    expect(isCarriedOver(today, [intention({ text: 'Walk 30 minutes', task_id: 't1' })])).toBe(false)
  })

  it('is false against an empty day', () => {
    expect(isCarriedOver(intention({}), [])).toBe(false)
  })
})

describe('dayRange', () => {
  it('spans local midnight to the next local midnight', () => {
    const { from, to } = dayRange(new Date(2026, 8, 25, 17, 30))
    expect(from).toEqual(new Date(2026, 8, 25))
    expect(to).toEqual(new Date(2026, 8, 26))
  })
})
