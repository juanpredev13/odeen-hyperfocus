import { describe, expect, it } from 'vitest'
import {
  blocksForDay,
  formatMinute,
  intentionsMessage,
  isDailyDue,
  localNow,
  progressMessage,
  timeToMinute,
  upcomingBlocks,
  type ScheduleBlock,
} from './reminders'

function block(overrides: Partial<ScheduleBlock>): ScheduleBlock {
  return {
    id: 'b1',
    segment_id: 's1',
    day_of_week: null,
    date: null,
    start_minute: 540,
    end_minute: 600,
    title: null,
    ...overrides,
  }
}

describe('localNow', () => {
  it('converts to the user timezone', () => {
    // 2026-11-16 14:05 UTC is 08:05 in Costa Rica (UTC-6), a Monday
    const now = localNow(new Date('2026-11-16T14:05:00Z'), 'America/Costa_Rica')
    expect(now).toEqual({ date: '2026-11-16', minute: 485, isoDow: 1 })
  })

  it('rolls the date back across midnight', () => {
    const now = localNow(new Date('2026-11-16T03:00:00Z'), 'America/Costa_Rica')
    expect(now).toEqual({ date: '2026-11-15', minute: 21 * 60, isoDow: 7 })
  })

  it('falls back to UTC for an unknown timezone', () => {
    const now = localNow(new Date('2026-11-16T14:05:00Z'), 'Not/AZone')
    expect(now.minute).toBe(14 * 60 + 5)
  })
})

describe('time helpers', () => {
  it('parses Postgres time', () => {
    expect(timeToMinute('08:30:00')).toBe(510)
    expect(timeToMinute('18:00')).toBe(1080)
  })

  it('formats minutes', () => {
    expect(formatMinute(545)).toBe('09:05')
  })

  it('is due only inside the daily window', () => {
    expect(isDailyDue(479, 480)).toBe(false)
    expect(isDailyDue(480, 480)).toBe(true)
    expect(isDailyDue(599, 480)).toBe(true)
    expect(isDailyDue(600, 480)).toBe(false)
  })
})

describe('schedule', () => {
  const template = block({ id: 't', day_of_week: 1 })
  const override = block({ id: 'o', date: '2026-11-16' })

  it('uses the template unless the day was edited', () => {
    expect(blocksForDay([template, override], '2026-11-16', 1, false)).toEqual([template])
    expect(blocksForDay([template, override], '2026-11-16', 1, true)).toEqual([override])
  })

  it('picks blocks starting within the lead time', () => {
    const blocks = [block({ id: 'a', start_minute: 540 }), block({ id: 'b', start_minute: 600 })]
    expect(upcomingBlocks(blocks, 530, 10).map((b) => b.id)).toEqual(['a'])
    expect(upcomingBlocks(blocks, 529, 10)).toEqual([])
    expect(upcomingBlocks(blocks, 540, 10)).toEqual([])
  })
})

describe('messages', () => {
  it('nudges until three intentions exist', () => {
    expect(intentionsMessage(0)).toBe('Set your 3 intentions for today.')
    expect(intentionsMessage(2)).toBe('You have 2 of 3. One more to go.')
    expect(intentionsMessage(3)).toBeNull()
  })

  it('lists open projects, fewest left first', () => {
    const message = progressMessage([
      { name: 'Odeen', total: 11, done: 4 },
      { name: 'Done one', total: 3, done: 3 },
      { name: 'Empty', total: 0, done: 0 },
      { name: 'Kbeauty', total: 5, done: 2 },
    ])
    expect(message).toBe('Kbeauty: 3 left (2/5) · Odeen: 7 left (4/11)')
  })

  it('caps the list', () => {
    const projects = Array.from({ length: 6 }, (_, i) => ({ name: `P${i}`, total: 2, done: 1 }))
    expect(progressMessage(projects, 4)).toMatch(/\+2 more$/)
  })

  it('returns null with nothing open', () => {
    expect(progressMessage([])).toBeNull()
  })
})
