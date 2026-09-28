import { computed, ref } from 'vue'
import * as scheduleService from '@/modules/assistant/services/schedule.service'
import { fromISODate, toISODate } from '@/modules/assistant/composables/intentionHelpers'
import {
  DEFAULT_SEGMENTS,
  DEFAULT_TEMPLATE,
  blocksForDate,
  isoDayOfWeek,
  overlapsAny,
  planCopies,
  planSeries,
  seriesDateCopies,
  seriesTemplateByDay,
  templateBlocksFor,
  weekDates,
} from '@/modules/assistant/composables/scheduleHelpers'
import type {
  AssistantError,
  CreateBlockPayload,
  CreateSegmentPayload,
  DayOfWeek,
  ScheduleBlock,
  ScheduleSegment,
  UpdateBlockPayload,
  UpdateSegmentPayload,
} from '@/modules/assistant/types'

/** Where a block edit applies: the weekly template, or one calendar date. */
export type BlockScope = { kind: 'template'; day: DayOfWeek } | { kind: 'date'; date: Date }

/**
 * Where an edit applies. `date`: this date only (standalone). `template`:
 * the weekly template on the checked weekdays. `series`: every block of the
 * block's series. `one`: only this block, taken out of its series.
 */
export type ApplyTo = 'date' | 'template' | 'series' | 'one'

export interface SaveInput {
  /** The block as it was before editing, or null for a new one. */
  block: ScheduleBlock | null
  /** The day being edited (a date in the loaded week). */
  date: Date
  mode: 'template' | 'week'
  applyTo: ApplyTo
  /** Checked weekdays ("Repeat on"); the edited day's weekday is always included. */
  days: DayOfWeek[]
  fields: BlockFields
}

/** What a save changed, for the notice. */
export interface SaveReport {
  /** Template weekdays saved (created or updated). */
  template: DayOfWeek[]
  /** Template weekdays the series was removed from. */
  removed: DayOfWeek[]
  /** Template weekdays skipped because the time is taken. */
  skipped: DayOfWeek[]
  /** This week's edited days updated or given a copy. */
  week: DayOfWeek[]
  weekSkipped: DayOfWeek[]
}

function emptyReport(): SaveReport {
  return { template: [], removed: [], skipped: [], week: [], weekSkipped: [] }
}

export interface BlockFields {
  segment_id: string
  start_minute: number
  end_minute: number
  title: string | null
  note: string | null
}

// Module-level state: Today, the schedule view and focus sessions share it.
const segments = ref<ScheduleSegment[]>([])
const blocks = ref<ScheduleBlock[]>([])
const overriddenDates = ref<Set<string>>(new Set())
const loaded = ref(false)
const loading = ref(false)
const error = ref<AssistantError | null>(null)

function emptyToNull(value: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function clean(fields: BlockFields): BlockFields {
  return { ...fields, title: emptyToNull(fields.title), note: emptyToNull(fields.note) }
}

export function useSchedule() {
  const activeSegments = computed(() => segments.value.filter((s) => !s.archived))

  function segmentById(id: string): ScheduleSegment | undefined {
    return segments.value.find((s) => s.id === id)
  }

  /** Loads segments, the template and the overrides of the week containing `day`. */
  async function load(day: Date = new Date()): Promise<void> {
    loading.value = true
    error.value = null

    const week = weekDates(day)
    const from = toISODate(week[0] as Date)
    const to = toISODate(week[6] as Date)

    const [segmentsResult, blocksResult, overridesResult] = await Promise.all([
      scheduleService.fetchSegments(),
      scheduleService.fetchBlocks(from, to),
      scheduleService.fetchOverrides(from, to),
    ])

    loading.value = false
    const failed = segmentsResult.error ?? blocksResult.error ?? overridesResult.error
    if (failed) {
      error.value = failed
      return
    }

    segments.value = segmentsResult.data ?? []
    blocks.value = blocksResult.data ?? []
    overriddenDates.value = new Set((overridesResult.data ?? []).map((o) => o.date))
    loaded.value = true
  }

  function blocksOn(date: Date): ScheduleBlock[] {
    return blocksForDate(blocks.value, overriddenDates.value, date)
  }

  function templateFor(day: DayOfWeek): ScheduleBlock[] {
    return templateBlocksFor(blocks.value, day)
  }

  function blocksIn(scope: BlockScope): ScheduleBlock[] {
    return scope.kind === 'template' ? templateFor(scope.day) : blocksOn(scope.date)
  }

  function isOverridden(date: Date): boolean {
    return overriddenDates.value.has(toISODate(date))
  }

  /** Creates the default segments; with `withTemplate`, also a starter week. */
  async function seedDefaults(withTemplate = false): Promise<boolean> {
    const before = segments.value.length
    if (!(await addSegments(DEFAULT_SEGMENTS))) return false
    if (!withTemplate) return true

    const created = segments.value.slice(before)
    const byIndex = DEFAULT_SEGMENTS.map((d) => created.find((s) => s.name === d.name))
    const result = await scheduleService.createBlocks(
      DEFAULT_TEMPLATE.flatMap((seed) => {
        const segment = byIndex[seed.segment]
        if (!segment) return []
        const seriesId = seed.days.length > 1 ? crypto.randomUUID() : null
        return seed.days.map((day) => ({
          series_id: seriesId,
          day_of_week: day,
          date: null,
          segment_id: segment.id,
          start_minute: seed.start,
          end_minute: seed.end,
          title: seed.title,
          note: null,
        }))
      }),
    )
    if (result.error) {
      error.value = result.error
      return false
    }
    blocks.value = [...blocks.value, ...(result.data ?? [])]
    return true
  }

  async function addSegments(payloads: readonly CreateSegmentPayload[]): Promise<boolean> {
    error.value = null
    const result = await scheduleService.createSegments(payloads)
    if (result.error) {
      error.value = result.error
      return false
    }
    segments.value = [...segments.value, ...(result.data ?? [])].sort((a, b) => a.position - b.position)
    return true
  }

  async function updateSegment(payload: UpdateSegmentPayload): Promise<boolean> {
    error.value = null
    const result = await scheduleService.updateSegment(payload)
    if (result.error) {
      error.value = result.error
      return false
    }
    const updated = result.data
    if (updated) {
      segments.value = segments.value
        .map((s) => (s.id === updated.id ? updated : s))
        .sort((a, b) => a.position - b.position)
    }
    return true
  }

  /** Swaps a segment with its neighbour in the list order. */
  async function moveSegment(id: string, direction: -1 | 1): Promise<boolean> {
    const list = activeSegments.value
    const index = list.findIndex((s) => s.id === id)
    const other = list[index + direction]
    const current = list[index]
    if (!current || !other) return false

    const ok = await updateSegment({ id: current.id, position: other.position })
    if (!ok) return false
    return updateSegment({ id: other.id, position: current.position })
  }

  /**
   * Detaches `date` from the template (copying its blocks) if it isn't yet,
   * and returns the date's own blocks.
   */
  async function ensureOverride(date: Date): Promise<ScheduleBlock[] | null> {
    const iso = toISODate(date)
    if (overriddenDates.value.has(iso)) return blocks.value.filter((b) => b.date === iso)

    const result = await scheduleService.overrideDay(iso, templateFor(isoDayOfWeek(date)))
    if (result.error) {
      error.value = result.error
      return null
    }
    const copies = result.data ?? []
    blocks.value = [...blocks.value, ...copies]
    overriddenDates.value = new Set([...overriddenDates.value, iso])
    return copies
  }

  /** The date copy of a template block, matched by its time range. */
  function copyOf(block: ScheduleBlock, copies: readonly ScheduleBlock[]): ScheduleBlock | undefined {
    return copies.find((c) => c.start_minute === block.start_minute && c.end_minute === block.end_minute)
  }

  function replaceBlock(updated: ScheduleBlock): void {
    blocks.value = blocks.value.map((b) => (b.id === updated.id ? updated : b))
  }

  async function createBlock(scope: BlockScope, fields: BlockFields): Promise<boolean> {
    error.value = null

    let day: { day_of_week: DayOfWeek; date: null } | { day_of_week: null; date: string }
    if (scope.kind === 'template') {
      day = { day_of_week: scope.day, date: null }
    } else {
      if ((await ensureOverride(scope.date)) === null) return false
      day = { day_of_week: null, date: toISODate(scope.date) }
    }

    const result = await scheduleService.createBlock({ ...day, ...clean(fields) })
    if (result.error) {
      error.value = result.error
      return false
    }
    if (result.data) blocks.value = [...blocks.value, result.data]
    return true
  }

  function uniqueDays(days: readonly DayOfWeek[]): DayOfWeek[] {
    return [...new Set(days)].sort((a, b) => a - b)
  }

  /** The date of `day` in the week containing `anchor`. */
  function dateInWeek(anchor: Date, day: DayOfWeek): Date {
    return weekDates(anchor)[day - 1] as Date
  }

  /** Weekdays a block's series covers (its own weekday included); [] if standalone. */
  function seriesDays(block: ScheduleBlock): DayOfWeek[] {
    if (block.series_id === null) return []
    const days: DayOfWeek[] = [...seriesTemplateByDay(blocks.value, block.series_id).keys()]
    if (block.day_of_week !== null) days.push(block.day_of_week)
    if (block.date !== null) days.push(isoDayOfWeek(fromISODate(block.date)))
    return uniqueDays(days)
  }

  /** Ids of every loaded block in the same series (template and date copies). */
  function seriesMemberIds(block: ScheduleBlock): Set<string> {
    const ids = new Set<string>([block.id])
    if (block.series_id === null) return ids
    for (const b of blocks.value) if (b.series_id === block.series_id) ids.add(b.id)
    return ids
  }

  async function insertBlocks(payloads: CreateBlockPayload[]): Promise<boolean> {
    if (payloads.length === 0) return true
    const result = await scheduleService.createBlocks(payloads)
    if (result.error) {
      error.value = result.error
      return false
    }
    blocks.value = [...blocks.value, ...(result.data ?? [])]
    return true
  }

  async function patchBlock(id: string, fields: Omit<UpdateBlockPayload, 'id'>): Promise<boolean> {
    const result = await scheduleService.updateBlock({ id, ...fields })
    if (result.error) {
      error.value = result.error
      return false
    }
    if (result.data) replaceBlock(result.data)
    return true
  }

  async function dropBlocks(ids: readonly string[]): Promise<boolean> {
    if (ids.length === 0) return true
    const result = await scheduleService.deleteBlocks(ids)
    if (result.error) {
      error.value = result.error
      return false
    }
    const gone = new Set(ids)
    blocks.value = blocks.value.filter((b) => !gone.has(b.id))
    return true
  }

  /**
   * Edited days of the week don't show the template, so a weekly block is
   * also placed on them directly (same series). Taken times are skipped.
   */
  async function placeOnEditedDays(
    anchor: Date,
    days: readonly DayOfWeek[],
    fields: BlockFields,
    seriesId: string | null,
    report: SaveReport,
  ): Promise<boolean> {
    const payloads: CreateBlockPayload[] = []
    for (const day of days) {
      const date = dateInWeek(anchor, day)
      const iso = toISODate(date)
      if (!overriddenDates.value.has(iso)) continue
      if (seriesId !== null && blocks.value.some((b) => b.date === iso && b.series_id === seriesId)) continue
      if (overlapsAny(blocksOn(date), fields)) {
        report.weekSkipped.push(day)
        continue
      }
      payloads.push({ day_of_week: null, date: iso, ...fields, series_id: seriesId })
      report.week.push(day)
    }
    return insertBlocks(payloads)
  }

  /**
   * Saves a block from the editor. Rules:
   * - `one`: edit only this block and take it out of its series (in This week,
   *   a template block is first copied onto the date).
   * - `date`: a standalone edit of this date (This week, "This day only").
   * - `series`: edit every block of the series — template blocks on the
   *   checked weekdays are updated, created where missing and removed from
   *   unchecked days; this week's copies follow.
   * - `template`: save into the weekly template on the checked weekdays; when
   *   that spans several days (or links a date block), the blocks become a
   *   new series.
   */
  async function saveBlock(input: SaveInput): Promise<SaveReport | null> {
    error.value = null
    const { block, date, applyTo, mode } = input
    const fields = clean(input.fields)
    const base = isoDayOfWeek(date)
    const days = uniqueDays([base, ...input.days])
    const report = emptyReport()

    if (applyTo === 'one' && block) {
      if (mode === 'week' && block.date === null) {
        const copies = await ensureOverride(date)
        if (copies === null) return null
        const copy = copies.find((c) => c.series_id === block.series_id && c.start_minute === block.start_minute)
        if (!copy) {
          error.value = { message: 'Could not find this block on that day' }
          return null
        }
        return (await patchBlock(copy.id, { ...fields, series_id: null })) ? report : null
      }
      return (await patchBlock(block.id, { ...fields, series_id: null })) ? report : null
    }

    if (applyTo === 'date') {
      const ok = block ? await updateBlock(block, { kind: 'date', date }, fields) : await createBlock({ kind: 'date', date }, fields)
      return ok ? report : null
    }

    if (applyTo === 'series' && block && block.series_id !== null) {
      const seriesId = block.series_id
      const plan = planSeries(days, seriesTemplateByDay(blocks.value, seriesId), templateFor, fields)
      const removedDays = plan.remove.map((b) => b.day_of_week).filter((d): d is DayOfWeek => d !== null)

      const updated = await Promise.all(plan.update.map((b) => patchBlock(b.id, fields)))
      if (updated.includes(false)) return null
      if (!(await insertBlocks(plan.create.map((day) => ({ day_of_week: day, date: null, ...fields, series_id: seriesId }))))) return null
      if (!(await dropBlocks(plan.remove.map((b) => b.id)))) return null

      // This week's copies of the series follow the edit.
      const staleCopies: string[] = []
      for (const copy of seriesDateCopies(blocks.value, seriesId)) {
        const copyDate = fromISODate(copy.date as string)
        const day = isoDayOfWeek(copyDate)
        if (!days.includes(day)) {
          staleCopies.push(copy.id)
          continue
        }
        if (overlapsAny(blocksOn(copyDate), fields, copy.id)) {
          report.weekSkipped.push(day)
          continue
        }
        if (!(await patchBlock(copy.id, fields))) return null
        report.week.push(day)
      }
      if (!(await dropBlocks(staleCopies))) return null
      if (!(await placeOnEditedDays(date, plan.create, fields, seriesId, report))) return null

      report.template = uniqueDays([...plan.update.map((b) => b.day_of_week as DayOfWeek), ...plan.create])
      report.removed = removedDays
      report.skipped = plan.skipped
      return report
    }

    // `template`: a new block, a standalone template block, or a date block
    // being turned into a weekly routine.
    const isDateBlock = block !== null && block.date !== null
    const seriesId = days.length > 1 || isDateBlock ? crypto.randomUUID() : null
    const targetDays = block && !isDateBlock ? days.filter((d) => d !== base) : days
    const { free, taken } = planCopies(targetDays, templateFor, fields)

    if (block) {
      if (!(await patchBlock(block.id, { ...fields, series_id: seriesId }))) return null
    } else if (taken.includes(base)) {
      error.value = { message: 'Blocks cannot overlap on the same day' }
      return null
    }
    if (!(await insertBlocks(free.map((day) => ({ day_of_week: day, date: null, ...fields, series_id: seriesId }))))) {
      return null
    }
    report.template = uniqueDays(block && !isDateBlock ? [base, ...free] : free)
    report.skipped = taken

    // A routine shows up this week too, even on days edited this week.
    if (seriesId !== null || mode === 'week') {
      const others = isDateBlock ? days.filter((d) => d !== base) : days
      if (!(await placeOnEditedDays(date, others, fields, seriesId, report))) return null
    }
    return report
  }

  /**
   * Deletes a block from the editor: the whole series (`series`), or only
   * this block (`one` / standalone). In This week, deleting only a template
   * block's day copies the day first, so the template stays intact.
   */
  async function removeBlock(input: Omit<SaveInput, 'fields' | 'days'>): Promise<DayOfWeek[] | null> {
    error.value = null
    const { block, date, applyTo, mode } = input
    if (!block) return []

    if (applyTo === 'series' && block.series_id !== null) {
      const days = seriesDays(block)
      const seriesId = block.series_id
      const result = await scheduleService.deleteSeries(seriesId)
      if (result.error) {
        error.value = result.error
        return null
      }
      blocks.value = blocks.value.filter((b) => b.series_id !== seriesId)
      return days
    }

    if (mode === 'week' && block.date === null) {
      return (await deleteBlock(block, { kind: 'date', date })) ? [] : null
    }
    return (await dropBlocks([block.id])) ? [] : null
  }

  /** Deletes blocks by id, wherever they live (template or date). */
  async function removeBlocks(targets: readonly ScheduleBlock[]): Promise<boolean> {
    error.value = null
    return dropBlocks(targets.map((b) => b.id))
  }

  /**
   * Updates a block. Editing a template block with a `date` scope detaches
   * that day first and edits only its copy, so the template stays intact.
   */
  async function updateBlock(block: ScheduleBlock, scope: BlockScope, fields: BlockFields): Promise<boolean> {
    error.value = null

    let target: ScheduleBlock | undefined = block
    if (scope.kind === 'date' && block.date === null) {
      const copies = await ensureOverride(scope.date)
      if (copies === null) return false
      target = copyOf(block, copies)
      if (!target) {
        error.value = { message: 'Could not find this block on that day' }
        return false
      }
    }

    const result = await scheduleService.updateBlock({ id: target.id, ...clean(fields) })
    if (result.error) {
      error.value = result.error
      return false
    }
    if (result.data) replaceBlock(result.data)
    return true
  }

  async function deleteBlock(block: ScheduleBlock, scope: BlockScope): Promise<boolean> {
    error.value = null

    let target: ScheduleBlock | undefined = block
    if (scope.kind === 'date' && block.date === null) {
      const copies = await ensureOverride(scope.date)
      if (copies === null) return false
      target = copyOf(block, copies)
      if (!target) return true
    }

    const result = await scheduleService.deleteBlock(target.id)
    if (result.error) {
      error.value = result.error
      return false
    }
    const removedId = target.id
    blocks.value = blocks.value.filter((b) => b.id !== removedId)
    return true
  }

  /** Drops a date's own blocks so it follows the template again. */
  async function resetDay(date: Date): Promise<boolean> {
    error.value = null
    const iso = toISODate(date)
    const result = await scheduleService.resetDay(iso)
    if (result.error) {
      error.value = result.error
      return false
    }
    blocks.value = blocks.value.filter((b) => b.date !== iso)
    const next = new Set(overriddenDates.value)
    next.delete(iso)
    overriddenDates.value = next
    return true
  }

  return {
    segments,
    activeSegments,
    blocks,
    overriddenDates,
    loaded,
    loading,
    error,
    load,
    segmentById,
    blocksOn,
    templateFor,
    blocksIn,
    isOverridden,
    seedDefaults,
    addSegments,
    updateSegment,
    moveSegment,
    createBlock,
    seriesDays,
    seriesMemberIds,
    saveBlock,
    removeBlock,
    removeBlocks,
    updateBlock,
    deleteBlock,
    resetDay,
  }
}
