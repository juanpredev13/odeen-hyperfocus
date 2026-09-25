import { describe, expect, it } from 'vitest'
import {
  EMPTY_ANSWERS,
  hasAnswer,
  isDue,
  latest,
  nextDueAt,
  onLocalDay,
  summarize,
} from '@/modules/assistant/composables/checkinHelpers'
import type { AwarenessCheckin } from '@/modules/assistant/types'

function checkin(partial: Partial<AwarenessCheckin>): AwarenessCheckin {
  return {
    id: 'c',
    user_id: 'u',
    at: '2026-09-25T15:00:00Z',
    intentional: null,
    on_consequential: null,
    space_fullness: null,
    energy: null,
    ...partial,
  }
}

const t = (hhmm: string) => new Date(`2026-09-25T${hhmm}:00`)

describe('hasAnswer', () => {
  it('is false for no answers and true for any single answer', () => {
    expect(hasAnswer(EMPTY_ANSWERS)).toBe(false)
    expect(hasAnswer({ ...EMPTY_ANSWERS, energy: 3 })).toBe(true)
    expect(hasAnswer({ ...EMPTY_ANSWERS, intentional: false })).toBe(true)
  })
})

describe('nextDueAt / isDue', () => {
  it('never schedules when the interval is off', () => {
    expect(nextDueAt(0, null, t('09:00'))).toBeNull()
    expect(isDue(0, null, t('09:00'), t('23:00'), false)).toBe(false)
  })

  it('first prompt waits a full interval from app open', () => {
    expect(nextDueAt(60, null, t('09:00'))).toEqual(t('10:00'))
    expect(isDue(60, null, t('09:00'), t('09:59'), false)).toBe(false)
    expect(isDue(60, null, t('09:00'), t('10:00'), false)).toBe(true)
  })

  it('counts from the last check-in or dismissal', () => {
    expect(isDue(90, t('10:00'), t('09:00'), t('11:29'), false)).toBe(false)
    expect(isDue(90, t('10:00'), t('09:00'), t('11:30'), false)).toBe(true)
  })

  it('is skipped while a focus session is running', () => {
    expect(isDue(60, t('08:00'), t('08:00'), t('12:00'), true)).toBe(false)
  })
})

describe('latest', () => {
  it('returns the most recent non-null date', () => {
    expect(latest(null, t('10:00'), t('09:00'))).toEqual(t('10:00'))
    expect(latest(null, null)).toBeNull()
  })
})

describe('summarize', () => {
  it('handles no check-ins', () => {
    expect(summarize([])).toEqual({ count: 0, intentionalPercent: null, lastEnergy: null })
  })

  it('computes % intentional over answered questions and the latest energy', () => {
    const list = [
      checkin({ at: '2026-09-25T09:00:00Z', intentional: true, energy: 4 }),
      checkin({ at: '2026-09-25T10:30:00Z', intentional: false, energy: 2 }),
      checkin({ at: '2026-09-25T12:00:00Z', intentional: true }),
      checkin({ at: '2026-09-25T13:30:00Z', space_fullness: 3 }),
    ]
    expect(summarize(list)).toEqual({ count: 4, intentionalPercent: 67, lastEnergy: 2 })
  })
})

describe('onLocalDay', () => {
  it('keeps check-ins from the same local calendar day', () => {
    const day = new Date(2026, 8, 25, 12)
    const same = new Date(2026, 8, 25, 23, 30).toISOString()
    const other = new Date(2026, 8, 26, 0, 30).toISOString()
    expect(onLocalDay([checkin({ id: 'a', at: same }), checkin({ id: 'b', at: other })], day).map((c) => c.id)).toEqual(['a'])
  })
})
