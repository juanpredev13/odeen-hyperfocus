import { describe, expect, it } from 'vitest'
import {
  QUADRANTS,
  filterByQuadrant,
  getQuadrantInfo,
  getTaskQuadrant,
  isProductive,
} from '@/modules/tasks/composables/useTaskQuadrant'
import type { ImpactScore } from '@/modules/tasks/types'

function task(impact_score: ImpactScore, is_attractive: boolean) {
  return { impact_score, is_attractive }
}

describe('isProductive', () => {
  it.each([
    [1, false],
    [2, false],
    [3, true],
    [4, true],
    [5, true],
  ] as const)('impact %i → %s', (impact, expected) => {
    expect(isProductive({ impact_score: impact })).toBe(expected)
  })
})

describe('getTaskQuadrant', () => {
  it('productive + attractive → purposeful', () => {
    expect(getTaskQuadrant(task(5, true))).toBe('purposeful')
  })

  it('productive + not attractive → necessary', () => {
    expect(getTaskQuadrant(task(4, false))).toBe('necessary')
  })

  it('unproductive + attractive → distracting', () => {
    expect(getTaskQuadrant(task(1, true))).toBe('distracting')
  })

  it('unproductive + not attractive → unnecessary', () => {
    expect(getTaskQuadrant(task(2, false))).toBe('unnecessary')
  })

  it('treats the threshold (3) as productive', () => {
    expect(getTaskQuadrant(task(3, false))).toBe('necessary')
    expect(getTaskQuadrant(task(2, true))).toBe('distracting')
  })

  it('existing tasks (default impact 1, not attractive) → unnecessary', () => {
    expect(getTaskQuadrant(task(1, false))).toBe('unnecessary')
  })
})

describe('filterByQuadrant', () => {
  const tasks = [task(5, true), task(4, false), task(1, true), task(2, false), task(3, true)]

  it('returns a copy of all tasks when no quadrant is selected', () => {
    const result = filterByQuadrant(tasks, null)
    expect(result).toEqual(tasks)
    expect(result).not.toBe(tasks)
  })

  it('keeps only tasks in the selected quadrant', () => {
    expect(filterByQuadrant(tasks, 'purposeful')).toEqual([task(5, true), task(3, true)])
    expect(filterByQuadrant(tasks, 'unnecessary')).toEqual([task(2, false)])
  })
})

describe('QUADRANTS metadata', () => {
  it('covers all four quadrants exactly once', () => {
    expect(QUADRANTS.map((q) => q.id).sort()).toEqual([
      'distracting',
      'necessary',
      'purposeful',
      'unnecessary',
    ])
  })

  it('getQuadrantInfo returns the matching label', () => {
    expect(getQuadrantInfo('necessary').label).toBe('Necessary')
  })
})
