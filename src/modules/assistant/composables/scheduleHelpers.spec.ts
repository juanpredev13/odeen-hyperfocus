import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEMPLATE,
  DAY_END_MINUTE,
  DAY_START_MINUTE,
  blockSize,
  blocksForDate,
  currentBlock,
  focusedMinutesBySegment,
  formatMinutes,
  formatRange,
  isValidRange,
  isWithinPlannedDay,
  isoDayOfWeek,
  nextBlock,
  overlapsAny,
  planCopies,
  plannedMinutesBySegment,
  snapMinutes,
  weekDates,
} from '@/modules/assistant/composables/scheduleHelpers'
import type { FocusSession } from '@/modules/focus/types'
import type { ScheduleBlock } from '@/modules/assistant/types'

function block(partial: Partial<ScheduleBlock>): ScheduleBlock {
  return {
    id: 'b',
    user_id: 'u',
    segment_id: 'work',
    day_of_week: 1,
    date: null,
    start_minute: 540,
    end_minute: 720,
    title: null,
    note: null,
    created_at: '2026-09-28T00:00:00Z',
    ...partial,
  }
}

function session(partial: Partial<FocusSession>): FocusSession {
  return {
    id: 's',
    user_id: 'u',
    task_id: null,
    segment_id: null,
    mode: 'hyperfocus',
    planned_minutes: 25,
    actual_minutes: 25,
    started_at: '2026-09-28T10:00:00Z',
    ended_at: '2026-09-28T10:25:00Z',
    refocus_count: 0,
    extended: false,
    notes: null,
    created_at: '2026-09-28T10:00:00Z',
    ...partial,
  }
}

// 2026-09-28 is a Monday.
const MONDAY = new Date(2026, 8, 28)
const TUESDAY = new Date(2026, 8, 29)
const SUNDAY = new Date(2026, 9, 4)

describe('snapMinutes', () => {
  it.each([
    [0, 0],
    [7, 0],
    [8, 15],
    [542, 540],
    [553, 555],
    [-30, 0],
    [1500, 1440],
    [Number.NaN, 0],
  ])('%s → %s', (input, expected) => {
    expect(snapMinutes(input)).toBe(expected)
  })
})

describe('formatMinutes / formatRange', () => {
  it('pads hours and minutes', () => {
    expect(formatMinutes(0)).toBe('00:00')
    expect(formatMinutes(555)).toBe('09:15')
    expect(formatMinutes(1440)).toBe('24:00')
    expect(formatRange({ start_minute: 630, end_minute: 645 })).toBe('10:30 – 10:45')
  })
})

describe('blockSize', () => {
  it.each([
    [15, 'mini'],
    [30, 'short'],
    [45, 'short'],
    [60, 'full'],
  ] as const)('%s min → %s', (minutes, expected) => {
    expect(blockSize(minutes)).toBe(expected)
  })
})

describe('isoDayOfWeek / weekDates', () => {
  it('maps Monday to 1 and Sunday to 7', () => {
    expect(isoDayOfWeek(MONDAY)).toBe(1)
    expect(isoDayOfWeek(SUNDAY)).toBe(7)
  })

  it('returns Monday to Sunday for any day of the week', () => {
    const days = weekDates(SUNDAY)
    expect(days).toHaveLength(7)
    expect(days[0]).toEqual(MONDAY)
    expect(days[6]).toEqual(SUNDAY)
  })
})

describe('blocksForDate', () => {
  const blocks = [
    block({ id: 'mon-late', day_of_week: 1, start_minute: 780, end_minute: 840 }),
    block({ id: 'mon-early', day_of_week: 1, start_minute: 540, end_minute: 720 }),
    block({ id: 'tue', day_of_week: 2 }),
    block({ id: 'override', day_of_week: null, date: '2026-09-29', start_minute: 600, end_minute: 615 }),
  ]

  it('uses the template for a normal day, sorted by start', () => {
    expect(blocksForDate(blocks, new Set(), MONDAY).map((b) => b.id)).toEqual(['mon-early', 'mon-late'])
  })

  it('uses only the date blocks when the day is overridden', () => {
    expect(blocksForDate(blocks, new Set(['2026-09-29']), TUESDAY).map((b) => b.id)).toEqual(['override'])
  })

  it('ignores override blocks when the day is not marked as overridden', () => {
    expect(blocksForDate(blocks, new Set(), TUESDAY).map((b) => b.id)).toEqual(['tue'])
  })

  it('returns an empty day when overridden with no blocks', () => {
    expect(blocksForDate(blocks, new Set(['2026-09-28']), MONDAY)).toEqual([])
  })
})

describe('currentBlock / nextBlock', () => {
  const day = [
    block({ id: 'a', start_minute: 540, end_minute: 720 }),
    block({ id: 'b', start_minute: 750, end_minute: 765 }),
  ]

  it('finds the block containing the minute (end exclusive)', () => {
    expect(currentBlock(day, 540)?.id).toBe('a')
    expect(currentBlock(day, 719)?.id).toBe('a')
    expect(currentBlock(day, 720)).toBeNull()
  })

  it('finds the next block after the minute', () => {
    expect(nextBlock(day, 720)?.id).toBe('b')
    expect(nextBlock(day, 800)).toBeNull()
  })
})

describe('overlapsAny / isValidRange', () => {
  const day = [block({ id: 'a', start_minute: 540, end_minute: 720 })]

  it('treats touching blocks as not overlapping', () => {
    expect(overlapsAny(day, { start_minute: 720, end_minute: 735 })).toBe(false)
    expect(overlapsAny(day, { start_minute: 525, end_minute: 540 })).toBe(false)
  })

  it('detects overlaps and ignores the block being edited', () => {
    expect(overlapsAny(day, { start_minute: 705, end_minute: 735 })).toBe(true)
    expect(overlapsAny(day, { start_minute: 600, end_minute: 780 }, 'a')).toBe(false)
  })

  it('validates mini-slot ranges', () => {
    expect(isValidRange({ start_minute: 540, end_minute: 555 })).toBe(true)
    expect(isValidRange({ start_minute: 540, end_minute: 540 })).toBe(false)
    expect(isValidRange({ start_minute: 541, end_minute: 555 })).toBe(false)
    expect(isValidRange({ start_minute: 1425, end_minute: 1455 })).toBe(false)
  })
})

describe('plannedMinutesBySegment', () => {
  it('sums the blocks that apply on each day, honouring overrides', () => {
    const blocks = [
      block({ segment_id: 'work', day_of_week: 1, start_minute: 540, end_minute: 720 }),
      block({ segment_id: 'work', day_of_week: 2, start_minute: 540, end_minute: 720 }),
      block({ segment_id: 'rest', day_of_week: 2, start_minute: 1380, end_minute: 1440 }),
      block({ segment_id: 'leisure', day_of_week: null, date: '2026-09-29', start_minute: 600, end_minute: 660 }),
    ]
    const planned = plannedMinutesBySegment(blocks, new Set(['2026-09-29']), [MONDAY, TUESDAY])
    expect(planned.get('work')).toBe(180)
    expect(planned.get('leisure')).toBe(60)
    expect(planned.has('rest')).toBe(false)
  })
})

describe('focusedMinutesBySegment', () => {
  it('counts finished hyperfocus sessions tagged with a segment', () => {
    const focused = focusedMinutesBySegment([
      session({ segment_id: 'work', actual_minutes: 50 }),
      session({ segment_id: 'work', actual_minutes: 25 }),
      session({ segment_id: 'learning', mode: 'break', actual_minutes: 15 }),
      session({ segment_id: 'learning', actual_minutes: null, ended_at: null }),
      session({ segment_id: null, actual_minutes: 40 }),
    ])
    expect(focused.get('work')).toBe(75)
    expect(focused.has('learning')).toBe(false)
  })
})

describe('planned day (06:00–22:00)', () => {
  it('spans 06:00 to 22:00', () => {
    expect(DAY_START_MINUTE).toBe(360)
    expect(DAY_END_MINUTE).toBe(1320)
  })

  it('accepts ranges inside the day, edges included', () => {
    expect(isWithinPlannedDay({ start_minute: 360, end_minute: 375 })).toBe(true)
    expect(isWithinPlannedDay({ start_minute: 1305, end_minute: 1320 })).toBe(true)
  })

  it('rejects ranges before 06:00 or after 22:00', () => {
    expect(isWithinPlannedDay({ start_minute: 345, end_minute: 375 })).toBe(false)
    expect(isWithinPlannedDay({ start_minute: 1305, end_minute: 1335 })).toBe(false)
  })

  it('keeps the starter week inside the planned day', () => {
    for (const seed of DEFAULT_TEMPLATE) {
      expect(isWithinPlannedDay({ start_minute: seed.start, end_minute: seed.end })).toBe(true)
    }
  })
})

describe('planCopies', () => {
  const byDay: Record<number, ScheduleBlock[]> = {
    2: [block({ id: 'tue', day_of_week: 2, start_minute: 540, end_minute: 600 })],
    4: [block({ id: 'thu', day_of_week: 4, start_minute: 780, end_minute: 840 })],
  }
  const blocksOn = (day: number): ScheduleBlock[] => byDay[day] ?? []

  it('puts overlapping weekdays in taken and the rest in free', () => {
    const plan = planCopies([2, 3, 4, 5], blocksOn, { start_minute: 570, end_minute: 630 })
    expect(plan.free).toEqual([3, 4, 5])
    expect(plan.taken).toEqual([2])
  })

  it('treats touching blocks as free', () => {
    const plan = planCopies([2, 4], blocksOn, { start_minute: 600, end_minute: 780 })
    expect(plan.free).toEqual([2, 4])
    expect(plan.taken).toEqual([])
  })
})
