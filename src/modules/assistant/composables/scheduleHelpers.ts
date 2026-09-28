import { addDays, toISODate, weekStart } from '@/modules/assistant/composables/intentionHelpers'
import type { FocusSession } from '@/modules/focus/types'
import type {
  CreateSegmentPayload,
  DayOfWeek,
  ScheduleBlock,
  SegmentColor,
} from '@/modules/assistant/types'

/** The base unit of the schedule: every block starts and ends on a mini-slot. */
export const SLOT_MINUTES = 15
export const DAY_MINUTES = 24 * 60

/** The planned day: blocks live between 06:00 and 22:00. */
export const DAY_START_MINUTE = 6 * 60
export const DAY_END_MINUTE = 22 * 60

export const SEGMENT_COLORS: readonly SegmentColor[] = [
  'emerald',
  'mint',
  'sage',
  'amber',
  'slate',
  'sky',
  'rose',
]

export const DEFAULT_SEGMENTS: readonly CreateSegmentPayload[] = [
  { name: 'Work', icon: 'work', color_key: 'emerald', position: 0 },
  { name: 'Learning', icon: 'menu_book', color_key: 'mint', position: 1 },
  { name: 'Side projects', icon: 'terminal', color_key: 'sage', position: 2 },
  { name: 'Leisure', icon: 'local_cafe', color_key: 'amber', position: 3 },
  { name: 'Rest', icon: 'bedtime', color_key: 'slate', position: 4 },
]

export const SEGMENT_ICONS: readonly string[] = [
  'work',
  'menu_book',
  'terminal',
  'local_cafe',
  'bedtime',
  'fitness_center',
  'family_restroom',
  'palette',
  'self_improvement',
  'inbox',
]

/** Rounds to the nearest mini-slot and clamps to the day. */
export function snapMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return 0
  const snapped = Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES
  return Math.min(DAY_MINUTES, Math.max(0, snapped))
}

/** 540 → "09:00", 1440 → "24:00". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatRange(block: Pick<ScheduleBlock, 'start_minute' | 'end_minute'>): string {
  return `${formatMinutes(block.start_minute)} – ${formatMinutes(block.end_minute)}`
}

export function blockMinutes(block: Pick<ScheduleBlock, 'start_minute' | 'end_minute'>): number {
  return block.end_minute - block.start_minute
}

/** How much a block card can show: mini (15m), short (≤ 45m) or full. */
export type BlockSize = 'mini' | 'short' | 'full'

export function blockSize(minutes: number): BlockSize {
  if (minutes <= SLOT_MINUTES) return 'mini'
  if (minutes <= 45) return 'short'
  return 'full'
}

/** ISO weekday of a local date: Monday = 1 … Sunday = 7. */
export function isoDayOfWeek(date: Date): DayOfWeek {
  const day = date.getDay()
  return (day === 0 ? 7 : day) as DayOfWeek
}

/** Minutes since local midnight. */
export function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/** Monday → Sunday of the week containing `date`. */
export function weekDates(date: Date): Date[] {
  const monday = weekStart(date)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

function byStart(a: ScheduleBlock, b: ScheduleBlock): number {
  return a.start_minute - b.start_minute
}

export function templateBlocksFor(blocks: readonly ScheduleBlock[], day: DayOfWeek): ScheduleBlock[] {
  return blocks.filter((b) => b.day_of_week === day).sort(byStart)
}

/**
 * The blocks that apply on `date`: the date's own blocks when the day is
 * overridden (possibly none), otherwise the template for that weekday.
 */
export function blocksForDate(
  blocks: readonly ScheduleBlock[],
  overriddenDates: ReadonlySet<string>,
  date: Date,
): ScheduleBlock[] {
  const iso = toISODate(date)
  if (overriddenDates.has(iso)) return blocks.filter((b) => b.date === iso).sort(byStart)
  return templateBlocksFor(blocks, isoDayOfWeek(date))
}

export function currentBlock(blocks: readonly ScheduleBlock[], minute: number): ScheduleBlock | null {
  return blocks.find((b) => b.start_minute <= minute && minute < b.end_minute) ?? null
}

export function nextBlock(blocks: readonly ScheduleBlock[], minute: number): ScheduleBlock | null {
  return [...blocks].sort(byStart).find((b) => b.start_minute > minute) ?? null
}

/** Whether a range overlaps any block of the same day (ignoring `ignoreId`). */
export function overlapsAny(
  dayBlocks: readonly Pick<ScheduleBlock, 'id' | 'start_minute' | 'end_minute'>[],
  range: { start_minute: number; end_minute: number },
  ignoreId: string | null = null,
): boolean {
  return dayBlocks.some(
    (b) => b.id !== ignoreId && b.start_minute < range.end_minute && range.start_minute < b.end_minute,
  )
}

/**
 * Splits target weekdays into the ones where a range fits and the ones
 * where it would overlap an existing block.
 */
export function planCopies(
  days: readonly DayOfWeek[],
  blocksOn: (day: DayOfWeek) => readonly Pick<ScheduleBlock, 'id' | 'start_minute' | 'end_minute'>[],
  range: { start_minute: number; end_minute: number },
): { free: DayOfWeek[]; taken: DayOfWeek[] } {
  const free: DayOfWeek[] = []
  const taken: DayOfWeek[] = []
  for (const day of days) (overlapsAny(blocksOn(day), range) ? taken : free).push(day)
  return { free, taken }
}

/** Two blocks count as "the same block" when segment, time range and focus match. */
export function isSameBlock(
  a: Pick<ScheduleBlock, 'segment_id' | 'start_minute' | 'end_minute' | 'title'>,
  b: Pick<ScheduleBlock, 'segment_id' | 'start_minute' | 'end_minute' | 'title'>,
): boolean {
  return (
    a.segment_id === b.segment_id &&
    a.start_minute === b.start_minute &&
    a.end_minute === b.end_minute &&
    (a.title ?? '') === (b.title ?? '')
  )
}

/**
 * The same block repeated on other weekdays of the template: same segment,
 * time range and focus. Keyed by weekday; the block's own day is left out.
 */
export function findSiblings(
  templateBlocks: readonly ScheduleBlock[],
  block: Pick<ScheduleBlock, 'id' | 'segment_id' | 'start_minute' | 'end_minute' | 'title' | 'day_of_week'>,
): Map<DayOfWeek, ScheduleBlock> {
  const siblings = new Map<DayOfWeek, ScheduleBlock>()
  for (const b of templateBlocks) {
    if (b.id === block.id || b.day_of_week === null || b.day_of_week === block.day_of_week) continue
    if (isSameBlock(b, block)) siblings.set(b.day_of_week, b)
  }
  return siblings
}

export interface SeriesPlan {
  /** Existing siblings to update with the new fields. */
  update: ScheduleBlock[]
  /** Checked days without the block yet. */
  create: DayOfWeek[]
  /** Unchecked days that had the block. */
  remove: ScheduleBlock[]
  /** Checked days where the new time is taken by another block. */
  skipped: DayOfWeek[]
}

/**
 * What to do on the other weekdays when a repeated template block is saved:
 * update the checked siblings, create it on newly checked days, remove it
 * from unchecked days. Overlaps skip a day instead of failing the save.
 */
export function planSeries(
  checkedDays: readonly DayOfWeek[],
  siblings: ReadonlyMap<DayOfWeek, ScheduleBlock>,
  blocksOn: (day: DayOfWeek) => readonly Pick<ScheduleBlock, 'id' | 'start_minute' | 'end_minute'>[],
  range: { start_minute: number; end_minute: number },
): SeriesPlan {
  const plan: SeriesPlan = { update: [], create: [], remove: [], skipped: [] }
  const checked = new Set(checkedDays)

  for (const day of checkedDays) {
    const sibling = siblings.get(day)
    if (overlapsAny(blocksOn(day), range, sibling?.id ?? null)) {
      plan.skipped.push(day)
      continue
    }
    if (sibling) plan.update.push(sibling)
    else plan.create.push(day)
  }
  for (const [day, sibling] of siblings) {
    if (!checked.has(day)) plan.remove.push(sibling)
  }
  return plan
}

/** Whether a range sits inside the planned day (06:00–22:00). */
export function isWithinPlannedDay(range: { start_minute: number; end_minute: number }): boolean {
  return range.start_minute >= DAY_START_MINUTE && range.end_minute <= DAY_END_MINUTE
}

/** The first block of the day that a range would overlap, if any. */
export function firstOverlap<T extends Pick<ScheduleBlock, 'id' | 'start_minute' | 'end_minute'>>(
  dayBlocks: readonly T[],
  range: { start_minute: number; end_minute: number },
  ignoreId: string | null = null,
): T | null {
  return (
    dayBlocks.find(
      (b) => b.id !== ignoreId && b.start_minute < range.end_minute && range.start_minute < b.end_minute,
    ) ?? null
  )
}

/** A valid block range: on mini-slots, inside the day, at least one slot long. */
export function isValidRange(range: { start_minute: number; end_minute: number }): boolean {
  return (
    range.start_minute >= 0 &&
    range.end_minute <= DAY_MINUTES &&
    range.start_minute < range.end_minute &&
    range.start_minute % SLOT_MINUTES === 0 &&
    range.end_minute % SLOT_MINUTES === 0
  )
}

/** Planned minutes per segment across the given days. */
export function plannedMinutesBySegment(
  blocks: readonly ScheduleBlock[],
  overriddenDates: ReadonlySet<string>,
  days: readonly Date[],
): Map<string, number> {
  const planned = new Map<string, number>()
  for (const day of days) {
    for (const block of blocksForDate(blocks, overriddenDates, day)) {
      planned.set(block.segment_id, (planned.get(block.segment_id) ?? 0) + blockMinutes(block))
    }
  }
  return planned
}

/** Finished hyperfocus minutes per segment. Untagged sessions are skipped. */
export function focusedMinutesBySegment(sessions: readonly FocusSession[]): Map<string, number> {
  const focused = new Map<string, number>()
  for (const s of sessions) {
    if (s.segment_id === null || s.mode !== 'hyperfocus' || s.actual_minutes === null) continue
    focused.set(s.segment_id, (focused.get(s.segment_id) ?? 0) + s.actual_minutes)
  }
  return focused
}

export function sumMinutes(values: Iterable<number>): number {
  let total = 0
  for (const v of values) total += v
  return total
}

export interface TemplateSeed {
  /** Index into DEFAULT_SEGMENTS. */
  segment: number
  days: readonly DayOfWeek[]
  start: number
  end: number
  title: string | null
}

const WEEKDAYS: readonly DayOfWeek[] = [1, 2, 3, 4, 5]
const ALL_DAYS: readonly DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7]

/** A starter week, offered when the user skips building one. */
export const DEFAULT_TEMPLATE: readonly TemplateSeed[] = [
  { segment: 0, days: WEEKDAYS, start: 540, end: 720, title: 'Deep work' },
  { segment: 0, days: WEEKDAYS, start: 720, end: 735, title: 'Inbox triage' },
  { segment: 1, days: WEEKDAYS, start: 750, end: 810, title: null },
  { segment: 0, days: WEEKDAYS, start: 840, end: 1020, title: null },
  { segment: 2, days: [2, 4], start: 1080, end: 1170, title: null },
  { segment: 2, days: [6], start: 600, end: 720, title: null },
  { segment: 3, days: ALL_DAYS, start: 1200, end: 1290, title: null },
  { segment: 4, days: ALL_DAYS, start: 1290, end: 1320, title: 'Wind down' },
]

export const WEEKDAY_NAMES: Record<DayOfWeek, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}
