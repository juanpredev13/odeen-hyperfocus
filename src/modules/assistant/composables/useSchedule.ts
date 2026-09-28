import { computed, ref } from 'vue'
import * as scheduleService from '@/modules/assistant/services/schedule.service'
import { toISODate } from '@/modules/assistant/composables/intentionHelpers'
import {
  DEFAULT_SEGMENTS,
  DEFAULT_TEMPLATE,
  blocksForDate,
  findSiblings,
  isoDayOfWeek,
  planCopies,
  planSeries,
  templateBlocksFor,
  weekDates,
} from '@/modules/assistant/composables/scheduleHelpers'
import type { SeriesPlan } from '@/modules/assistant/composables/scheduleHelpers'
import type {
  AssistantError,
  CreateSegmentPayload,
  DayOfWeek,
  ScheduleBlock,
  ScheduleSegment,
  UpdateSegmentPayload,
} from '@/modules/assistant/types'

/** Where a block edit applies: the weekly template, or one calendar date. */
export type BlockScope = { kind: 'template'; day: DayOfWeek } | { kind: 'date'; date: Date }

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
        return seed.days.map((day) => ({
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

  /**
   * Copies a block's fields onto other weekdays of the template. Days where
   * it would overlap an existing block are skipped and reported.
   */
  async function copyToDays(
    days: readonly DayOfWeek[],
    fields: BlockFields,
  ): Promise<{ added: DayOfWeek[]; skipped: DayOfWeek[] } | null> {
    error.value = null
    const { free, taken } = planCopies(days, templateFor, fields)
    if (free.length === 0) return { added: [], skipped: taken }

    const result = await scheduleService.createBlocks(
      free.map((day) => ({ day_of_week: day, date: null, ...clean(fields) })),
    )
    if (result.error) {
      error.value = result.error
      return null
    }
    blocks.value = [...blocks.value, ...(result.data ?? [])]
    return { added: free, skipped: taken }
  }

  /** Weekdays where a template block repeats (its own day included). */
  function seriesDays(block: ScheduleBlock): DayOfWeek[] {
    if (block.day_of_week === null) return []
    const templateBlocks = blocks.value.filter((b) => b.day_of_week !== null)
    return [block.day_of_week, ...findSiblings(templateBlocks, block).keys()].sort((a, b) => a - b)
  }

  /**
   * Saves a repeated template block across weekdays. `original` is the block
   * as it was before editing (used to find its siblings); `checkedDays` are
   * the other weekdays it should now be on. The block's own day is saved by
   * the caller.
   */
  async function applySeries(
    original: ScheduleBlock,
    checkedDays: readonly DayOfWeek[],
    fields: BlockFields,
  ): Promise<SeriesPlan | null> {
    error.value = null
    const templateBlocks = blocks.value.filter((b) => b.day_of_week !== null)
    const siblings = findSiblings(templateBlocks, original)
    const plan = planSeries(checkedDays, siblings, templateFor, fields)
    const cleaned = clean(fields)

    const [updates, created, removed] = await Promise.all([
      Promise.all(plan.update.map((b) => scheduleService.updateBlock({ id: b.id, ...cleaned }))),
      plan.create.length > 0
        ? scheduleService.createBlocks(plan.create.map((day) => ({ day_of_week: day, date: null, ...cleaned })))
        : Promise.resolve({ data: [] as ScheduleBlock[], error: null }),
      scheduleService.deleteBlocks(plan.remove.map((b) => b.id)),
    ])

    for (const result of updates) if (result.data) replaceBlock(result.data)
    if (created.data) blocks.value = [...blocks.value, ...created.data]
    if (!removed.error) {
      const gone = new Set(plan.remove.map((b) => b.id))
      blocks.value = blocks.value.filter((b) => !gone.has(b.id))
    }

    const failed = updates.find((r) => r.error)?.error ?? created.error ?? removed.error
    if (failed) {
      error.value = failed
      return null
    }
    return plan
  }

  /**
   * Deletes a date block and the matching weekly-template blocks (same
   * segment, time and focus) on the given weekdays.
   */
  async function deleteWithTemplate(dated: ScheduleBlock, days: readonly DayOfWeek[]): Promise<DayOfWeek[] | null> {
    error.value = null
    const templateBlocks = blocks.value.filter((b) => b.day_of_week !== null)
    const matches = findSiblings(templateBlocks, { ...dated, day_of_week: null })
    const fromTemplate = days.flatMap((d) => matches.get(d) ?? [])

    const ids = [dated.id, ...fromTemplate.map((b) => b.id)]
    const result = await scheduleService.deleteBlocks(ids)
    if (result.error) {
      error.value = result.error
      return null
    }
    const gone = new Set(ids)
    blocks.value = blocks.value.filter((b) => !gone.has(b.id))
    return fromTemplate.map((b) => b.day_of_week).filter((d): d is DayOfWeek => d !== null)
  }

  /** Deletes blocks by id, wherever they live (template or date). */
  async function removeBlocks(targets: readonly ScheduleBlock[]): Promise<boolean> {
    error.value = null
    const ids = targets.map((b) => b.id)
    const result = await scheduleService.deleteBlocks(ids)
    if (result.error) {
      error.value = result.error
      return false
    }
    const gone = new Set(ids)
    blocks.value = blocks.value.filter((b) => !gone.has(b.id))
    return true
  }

  /** Deletes a template block and its siblings on the given weekdays. */
  async function deleteSeries(original: ScheduleBlock, days: readonly DayOfWeek[]): Promise<boolean> {
    error.value = null
    const templateBlocks = blocks.value.filter((b) => b.day_of_week !== null)
    const siblings = findSiblings(templateBlocks, original)
    const targets = [original, ...days.flatMap((d) => siblings.get(d) ?? [])]

    const result = await scheduleService.deleteBlocks(targets.map((b) => b.id))
    if (result.error) {
      error.value = result.error
      return false
    }
    const gone = new Set(targets.map((b) => b.id))
    blocks.value = blocks.value.filter((b) => !gone.has(b.id))
    return true
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
    copyToDays,
    seriesDays,
    applySeries,
    deleteSeries,
    deleteWithTemplate,
    removeBlocks,
    updateBlock,
    deleteBlock,
    resetDay,
  }
}
