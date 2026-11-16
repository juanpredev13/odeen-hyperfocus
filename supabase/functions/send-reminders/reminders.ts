// Pure helpers for the send-reminders Edge Function. No Deno or Supabase
// imports, so Vitest can run them (reminders.spec.ts).

/** How long after its set time a daily reminder may still go out. */
export const DAILY_WINDOW_MINUTES = 120

export interface LocalNow {
  /** ISO calendar date in the user's timezone, e.g. 2026-11-16. */
  date: string
  /** Minutes since local midnight. */
  minute: number
  /** ISO weekday: 1 = Monday … 7 = Sunday. */
  isoDow: number
}

export interface ScheduleBlock {
  id: string
  segment_id: string
  day_of_week: number | null
  date: string | null
  start_minute: number
  end_minute: number
  title: string | null
}

export interface ProjectProgress {
  name: string
  total: number
  done: number
}

const WEEKDAYS: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
}

/** Falls back to UTC when the stored timezone is not a valid IANA name. */
export function localNow(at: Date, timeZone: string): LocalNow {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    }).formatToParts(at)
  } catch {
    return localNow(at, 'UTC')
  }

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? ''

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minute: Number(get('hour')) * 60 + Number(get('minute')),
    isoDow: WEEKDAYS[get('weekday')] ?? 1,
  }
}

/** Postgres `time` ('08:00:00' or '08:00') to minutes since midnight. */
export function timeToMinute(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

export function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60)
  const m = minute % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** A daily reminder is due from its set time until the window closes. */
export function isDailyDue(nowMinute: number, targetMinute: number): boolean {
  return nowMinute >= targetMinute && nowMinute < targetMinute + DAILY_WINDOW_MINUTES
}

/**
 * Blocks that apply to a date: the date's own blocks when the day was
 * edited (override), otherwise the weekly template for its weekday.
 */
export function blocksForDay(
  blocks: ScheduleBlock[],
  date: string,
  isoDow: number,
  hasOverride: boolean,
): ScheduleBlock[] {
  return blocks.filter((b) => (hasOverride ? b.date === date : b.day_of_week === isoDow))
}

/** Blocks starting within the next `leadMinutes` (not yet started). */
export function upcomingBlocks(
  blocks: ScheduleBlock[],
  nowMinute: number,
  leadMinutes: number,
): ScheduleBlock[] {
  return blocks.filter((b) => nowMinute >= b.start_minute - leadMinutes && nowMinute < b.start_minute)
}

export function intentionsMessage(written: number): string | null {
  if (written >= 3) return null
  if (written === 0) return 'Set your 3 intentions for today.'
  const left = 3 - written
  return `You have ${written} of 3. ${left === 1 ? 'One more' : `${left} more`} to go.`
}

/** "Odeen: 7 left (4/11) · Kbeauty: 3 left (2/5)", fewest left first. */
export function progressMessage(projects: ProjectProgress[], limit = 4): string | null {
  const open = projects
    .filter((p) => p.total > 0 && p.done < p.total)
    .sort((a, b) => a.total - a.done - (b.total - b.done))

  if (open.length === 0) return null

  const lines = open
    .slice(0, limit)
    .map((p) => `${p.name}: ${p.total - p.done} left (${p.done}/${p.total})`)
  const more = open.length - limit
  if (more > 0) lines.push(`+${more} more`)
  return lines.join(' · ')
}
