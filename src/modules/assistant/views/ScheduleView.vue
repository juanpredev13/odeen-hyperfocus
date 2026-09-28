<template>
  <div class="schedule">
    <AssistantNav />

    <p v-if="error" class="schedule__error" role="alert">{{ error.message }}</p>

    <ScheduleOnboarding
      v-if="loaded && activeSegments.length === 0"
      :busy="busy"
      @build="onboard(false)"
      @starter="onboard(true)"
    />

    <template v-else-if="loaded">
      <header class="schedule__header">
        <div class="schedule__mode" role="group" aria-label="Schedule mode">
          <button
            v-for="m in MODES"
            :key="m.id"
            class="schedule__mode-btn"
            :class="{ 'schedule__mode-btn--active': mode === m.id }"
            type="button"
            :aria-pressed="mode === m.id"
            @click="mode = m.id"
          >
            {{ m.label }}
          </button>
        </div>

        <div class="schedule__heading">
          <h1 class="schedule__title">{{ mode === 'template' ? 'Weekly rhythm.' : 'This week.' }}</h1>
          <p class="schedule__sub">
            {{ mode === 'template' ? 'Repeats every week' : weekLabel }}
            <span class="schedule__sub-accent">· 06:00–22:00 · 15-min grid</span>
          </p>
        </div>

        <RouterLink class="schedule__balance-link" :to="{ name: 'assistant-balance' }">
          <span class="material-symbols-outlined" aria-hidden="true">donut_large</span>
          Balance
        </RouterLink>
      </header>

      <p v-if="notice" class="schedule__notice" role="status">
        {{ notice }}
        <button class="schedule__notice-close" type="button" aria-label="Dismiss" @click="notice = null">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </p>

      <ul v-if="mode === 'week' && editedDays.length > 0" class="schedule__edited" aria-label="Edited days">
        <li v-for="day in editedDays" :key="day.key" class="schedule__edited-item">
          {{ day.label }} edited · hides the weekly template
          <button class="schedule__edited-reset" type="button" :disabled="busy" @click="handleResetDay(day.date)">
            Reset to template
          </button>
        </li>
      </ul>

      <div class="schedule__layout">
        <div class="schedule__grid">
          <WeekGrid
            :days="gridDays"
            :segments="activeSegments"
            :now-minute="mode === 'week' ? nowMinute : -1"
            @create="openNew"
            @update="handleDragUpdate"
            @edit="(target) => openEdit(target.dayIndex, target.block)"
          />
        </div>

        <div class="schedule__agenda">
          <DayAgenda
            :days="agendaDays"
            :selected-index="selectedIndex"
            :blocks="gridDays[selectedIndex]?.blocks ?? []"
            :segments="activeSegments"
            :now-minute="mode === 'week' ? nowMinute : -1"
            @select="selectedIndex = $event"
            @edit="(block) => openEdit(selectedIndex, block)"
          />
          <button class="schedule__fab" type="button" aria-label="Add block" @click="openNextFree">
            <span class="material-symbols-outlined" aria-hidden="true">add</span>
          </button>
        </div>

        <SegmentPanel
          class="schedule__panel"
          :segments="activeSegments"
          :planned-minutes="plannedMinutes"
          :block-counts="blockCounts"
          :scope-label="mode === 'template' ? 'template' : 'week'"
          :busy="busy"
          @add="handleAddSegment"
          @rename="(segment, name) => run(() => updateSegment({ id: segment.id, name }))"
          @move="(id, direction) => run(() => moveSegment(id, direction))"
          @archive="(segment) => run(() => updateSegment({ id: segment.id, archived: true }))"
        />
      </div>
    </template>

    <BlockEditor
      v-if="editor"
      :key="editor.key"
      :segments="activeSegments"
      :block="editor.block"
      :initial-start="editor.start"
      :initial-end="editor.end"
      :day-blocks="gridDays[editor.dayIndex]?.blocks ?? []"
      :template-blocks="templateFor(isoDayOfWeek(week[editor.dayIndex] as Date))"
      :context-label="editor.contextLabel"
      :scope-choice="editor.scopeChoice"
      :template-mode="mode === 'template'"
      :base-day="isoDayOfWeek(week[editor.dayIndex] as Date)"
      :series-days="editor.block ? seriesDays(editor.block) : []"
      :busy="busy"
      :error="editorError"
      @save="handleSave"
      @delete="handleDelete"
      @replace="handleReplace"
      @close="closeEditor"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AssistantNav from '@/modules/assistant/components/AssistantNav.vue'
import WeekGrid, { type GridDay, type GridRange } from '@/modules/assistant/components/WeekGrid.vue'
import DayAgenda, { type AgendaDay } from '@/modules/assistant/components/DayAgenda.vue'
import SegmentPanel from '@/modules/assistant/components/SegmentPanel.vue'
import BlockEditor, { type ApplyTo } from '@/modules/assistant/components/BlockEditor.vue'
import ScheduleOnboarding from '@/modules/assistant/components/ScheduleOnboarding.vue'
import { useSchedule, type BlockFields, type BlockScope } from '@/modules/assistant/composables/useSchedule'
import { toISODate } from '@/modules/assistant/composables/intentionHelpers'
import {
  DAY_END_MINUTE,
  DAY_START_MINUTE,
  SLOT_MINUTES,
  WEEKDAY_NAMES,
  blockMinutes,
  findSiblings,
  isoDayOfWeek,
  minuteOfDay,
  overlapsAny,
  plannedMinutesBySegment,
  snapMinutes,
  weekDates,
} from '@/modules/assistant/composables/scheduleHelpers'
import type { CreateSegmentPayload, DayOfWeek, ScheduleBlock } from '@/modules/assistant/types'

type Mode = 'template' | 'week'

const MODES: { id: Mode; label: string }[] = [
  { id: 'template', label: 'Template' },
  { id: 'week', label: 'This week' },
]

const {
  activeSegments,
  blocks,
  overriddenDates,
  loaded,
  error,
  load,
  blocksOn,
  templateFor,
  isOverridden,
  seedDefaults,
  addSegments,
  updateSegment,
  moveSegment,
  createBlock,
  copyToDays,
  seriesDays,
  syncDateCopies,
  applySeries,
  deleteSeries,
  deleteWithTemplate,
  removeBlocks,
  updateBlock,
  deleteBlock,
  resetDay,
} = useSchedule()

const today = new Date()
const week = weekDates(today)
const mode = ref<Mode>('week')
const busy = ref(false)
const selectedIndex = ref(isoDayOfWeek(today) - 1)
const nowMinute = ref(minuteOfDay(new Date()))
let clock: ReturnType<typeof setInterval> | undefined

const weekLabel = `Week of ${week[0]?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`

function dayBlocks(date: Date): ScheduleBlock[] {
  return mode.value === 'template' ? templateFor(isoDayOfWeek(date)) : blocksOn(date)
}

function hours(minutes: number): string {
  const h = minutes / 60
  return `${Number.isInteger(h) ? h : h.toFixed(2).replace(/0$/, '')}h`
}

const gridDays = computed<GridDay[]>(() =>
  week.map((date) => {
    const list = dayBlocks(date)
    const planned = list.reduce((sum, b) => sum + blockMinutes(b), 0)
    const edited = mode.value === 'week' && isOverridden(date)
    return {
      key: toISODate(date),
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      sub:
        mode.value === 'template'
          ? `${hours(planned)} planned`
          : `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}${edited ? ' · edited' : ''}`,
      isToday: mode.value === 'week' && toISODate(date) === toISODate(today),
      blocks: list,
    }
  }),
)

const agendaDays = computed<AgendaDay[]>(() =>
  week.map((date) => ({
    key: toISODate(date),
    short: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3),
    number: date.getDate(),
    isToday: mode.value === 'week' && toISODate(date) === toISODate(today),
  })),
)

const editedDays = computed(() =>
  week
    .filter((date) => overriddenDates.value.has(toISODate(date)))
    .map((date) => ({
      key: toISODate(date),
      date,
      label: date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }),
    })),
)

const plannedMinutes = computed(() =>
  mode.value === 'template'
    ? plannedMinutesBySegment(
        blocks.value.filter((b) => b.day_of_week !== null),
        new Set(),
        week,
      )
    : plannedMinutesBySegment(blocks.value, overriddenDates.value, week),
)

const blockCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const day of gridDays.value) {
    for (const b of day.blocks) counts.set(b.segment_id, (counts.get(b.segment_id) ?? 0) + 1)
  }
  return counts
})

// ── Editor ──

interface EditorState {
  key: number
  dayIndex: number
  block: ScheduleBlock | null
  start: number
  end: number
  contextLabel: string
  scopeChoice: { dateLabel: string; weekday: string } | null
}

const editor = ref<EditorState | null>(null)
const editorError = ref<string | null>(null)
const notice = ref<string | null>(null)
let editorKey = 0

function contextFor(dayIndex: number): { contextLabel: string; scopeChoice: EditorState['scopeChoice'] } {
  const date = week[dayIndex] as Date
  const weekday = WEEKDAY_NAMES[isoDayOfWeek(date)]
  if (mode.value === 'template') return { contextLabel: `Every ${weekday}`, scopeChoice: null }
  const dateLabel = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  return { contextLabel: dateLabel, scopeChoice: { dateLabel, weekday } }
}

function openNew(range: GridRange): void {
  editorError.value = null
  const context = contextFor(range.dayIndex)
  editor.value = { key: ++editorKey, dayIndex: range.dayIndex, block: null, start: range.start, end: range.end, ...context }
}

function openEdit(dayIndex: number, block: ScheduleBlock): void {
  editorError.value = null
  const context = contextFor(dayIndex)
  editor.value = {
    key: ++editorKey,
    dayIndex,
    block,
    start: block.start_minute,
    end: block.end_minute,
    contextLabel: context.contextLabel,
    // Date blocks can also be added to the template ("Every <weekday>").
    scopeChoice: context.scopeChoice,
  }
}

/** Opens a new 1-hour block at the next free time on the selected day. */
function openNextFree(): void {
  const list = gridDays.value[selectedIndex.value]?.blocks ?? []
  const isToday = gridDays.value[selectedIndex.value]?.isToday ?? false
  let start = Math.max(DAY_START_MINUTE, isToday ? snapMinutes(nowMinute.value + SLOT_MINUTES / 2) : 9 * 60)
  while (start < DAY_END_MINUTE && overlapsAny(list, { start_minute: start, end_minute: start + SLOT_MINUTES })) {
    start += SLOT_MINUTES
  }
  if (start >= DAY_END_MINUTE) start = DAY_END_MINUTE - SLOT_MINUTES
  let end = start + SLOT_MINUTES
  while (end < Math.min(DAY_END_MINUTE, start + 60) && !overlapsAny(list, { start_minute: start, end_minute: end + SLOT_MINUTES })) {
    end += SLOT_MINUTES
  }
  openNew({ dayIndex: selectedIndex.value, start, end })
}

function closeEditor(): void {
  editor.value = null
}

function scopeFor(dayIndex: number, applyTo: ApplyTo): BlockScope {
  const date = week[dayIndex] as Date
  if (mode.value === 'template' || applyTo === 'template') return { kind: 'template', day: isoDayOfWeek(date) }
  return { kind: 'date', date }
}

async function run(action: () => Promise<boolean>): Promise<boolean> {
  busy.value = true
  const ok = await action()
  busy.value = false
  return ok
}

function dayList(days: readonly DayOfWeek[]): string {
  return days.map((d) => WEEKDAY_NAMES[d].slice(0, 3)).join(', ')
}

async function handleSave(fields: BlockFields, applyTo: ApplyTo, alsoDays: DayOfWeek[]): Promise<void> {
  const state = editor.value
  if (!state) return
  const original = state.block
  const scope = scopeFor(state.dayIndex, applyTo)
  const ok = await run(() => (original ? updateBlock(original, scope, fields) : createBlock(scope, fields)))
  if (!ok) {
    editorError.value = error.value?.message ?? 'Could not save the block'
    return
  }

  notice.value = null
  const parts: string[] = []

  const baseDay = isoDayOfWeek(week[state.dayIndex] as Date)

  if (original && scope.kind === 'template' && (original.day_of_week !== null || original.date !== null)) {
    // Existing block, saved as a weekly routine: update its template copies on
    // every checked weekday, create it where missing, remove it from unchecked
    // days. A date block's own weekday is part of the series too.
    const checked = original.date !== null ? [...new Set([baseDay, ...alsoDays])] : alsoDays
    busy.value = true
    const plan = await applySeries(original, checked, fields)
    if (!plan) {
      busy.value = false
      editorError.value = error.value?.message ?? 'Saved this day, but could not update the other days'
      return
    }
    // Edited days of this week show their own copies, not the template.
    const dateOf = (d: DayOfWeek): Date => week[d - 1] as Date
    const removedDays = plan.remove.map((b) => b.day_of_week).filter((d): d is DayOfWeek => d !== null)
    const synced = await syncDateCopies(
      original,
      [baseDay, ...alsoDays].map(dateOf),
      removedDays.map(dateOf),
      fields,
    )
    busy.value = false

    const changed = [...plan.update.map((b) => b.day_of_week), ...plan.create].filter(
      (d): d is DayOfWeek => d !== null && (original.date !== null || d !== baseDay),
    )
    if (changed.length > 0) parts.push(`Weekly template updated on ${dayList([...new Set(changed)].sort((a, b) => a - b))}.`)
    if (removedDays.length > 0) parts.push(`Removed from ${dayList(removedDays)}.`)
    if (plan.skipped.length > 0) parts.push(`Skipped ${dayList(plan.skipped)}: that time is taken.`)
    const syncedDays = synced.updated.map(isoDayOfWeek).sort((a, b) => a - b)
    if (syncedDays.length > 0) parts.push(`This week's edited days updated: ${dayList(syncedDays)}.`)
    if (synced.skipped.length > 0) parts.push(`Not updated this week on ${dayList(synced.skipped.map(isoDayOfWeek))}: that time is taken.`)
  } else if (alsoDays.length > 0) {
    busy.value = true
    const copies = await copyToDays(alsoDays, fields)
    busy.value = false
    if (!copies) {
      editorError.value = error.value?.message ?? 'Saved, but could not copy to the other days'
      return
    }
    if (copies.added.length > 0) parts.push(`Also added to ${dayList(copies.added)}.`)
    if (copies.skipped.length > 0) parts.push(`Skipped ${dayList(copies.skipped)}: that time is taken.`)
  }

  // Edited days of this week don't show the template, so a new weekly block
  // is also placed on them directly — otherwise it would only appear next week.
  if (mode.value === 'week' && scope.kind === 'template' && !original) {
    const days = [baseDay, ...alsoDays]
    const edited = await addToEditedDays(days, fields)
    if (edited.added.length > 0) parts.push(`Also placed on this week's edited days: ${dayList(edited.added)}.`)
    if (edited.skipped.length > 0) parts.push(`Not placed on ${dayList(edited.skipped)} this week: that time is taken.`)
  }

  notice.value = parts.length > 0 ? parts.join(' ') : null
  closeEditor()
}

async function addToEditedDays(
  days: readonly DayOfWeek[],
  fields: BlockFields,
): Promise<{ added: DayOfWeek[]; skipped: DayOfWeek[] }> {
  const added: DayOfWeek[] = []
  const skipped: DayOfWeek[] = []
  busy.value = true
  for (const day of [...days].sort((a, b) => a - b)) {
    const date = week[day - 1] as Date
    if (!isOverridden(date)) continue
    if (overlapsAny(blocksOn(date), fields)) {
      skipped.push(day)
      continue
    }
    if (await createBlock({ kind: 'date', date }, fields)) added.push(day)
    else skipped.push(day)
  }
  busy.value = false
  return { added, skipped }
}

async function handleDelete(applyTo: ApplyTo, alsoDays: DayOfWeek[]): Promise<void> {
  const state = editor.value
  if (!state?.block) return
  const block = state.block
  const scope = scopeFor(state.dayIndex, applyTo)
  const baseDay = isoDayOfWeek(week[state.dayIndex] as Date)

  // A date block deleted with "Every <weekday>": remove it here and its
  // matching template blocks, so nothing hidden is left behind.
  if (block.date !== null && scope.kind === 'template') {
    busy.value = true
    const removed = await deleteWithTemplate(block, [baseDay, ...alsoDays])
    busy.value = false
    if (!removed) {
      editorError.value = error.value?.message ?? 'Could not delete the block'
      return
    }
    notice.value =
      removed.length > 0
        ? `Deleted here and from the weekly template on ${dayList([...removed].sort((a, b) => a - b))}.`
        : 'Deleted here. The weekly template had no matching block.'
    closeEditor()
    return
  }

  const series = scope.kind === 'template' && block.day_of_week !== null && alsoDays.length > 0
  const ok = await run(() => (series ? deleteSeries(block, alsoDays) : deleteBlock(block, scope)))
  if (!ok) {
    editorError.value = error.value?.message ?? 'Could not delete the block'
    return
  }
  notice.value = series ? `Deleted from ${dayList([baseDay, ...alsoDays].sort((a, b) => a - b))}.` : null
  closeEditor()
}

/**
 * Clears the way for the block being edited: removes every block its range
 * overlaps on the day it is saved to — the template weekday plus the checked
 * repeat days, or just the date — leaving the edited block itself alone.
 */
async function handleReplace(
  range: { start_minute: number; end_minute: number },
  applyTo: ApplyTo,
  alsoDays: DayOfWeek[],
): Promise<void> {
  const state = editor.value
  if (!state) return
  editorError.value = null
  const date = week[state.dayIndex] as Date
  const scope = scopeFor(state.dayIndex, applyTo)
  // The edited block and its own copies on other weekdays are never "in the way".
  const own = new Set<string>(state.block ? [state.block.id] : [])
  if (state.block) {
    const templateBlocks = blocks.value.filter((b) => b.day_of_week !== null)
    for (const sibling of findSiblings(templateBlocks, state.block).values()) own.add(sibling.id)
  }
  const overlapping = (list: readonly ScheduleBlock[]): ScheduleBlock[] =>
    list.filter((b) => !own.has(b.id) && b.start_minute < range.end_minute && range.start_minute < b.end_minute)

  let targets: ScheduleBlock[]
  if (scope.kind === 'template') {
    const days = state.block?.date == null ? [isoDayOfWeek(date), ...alsoDays] : alsoDays.concat(isoDayOfWeek(date))
    targets = [...new Set(days)].flatMap((d) => overlapping(templateFor(d)))
    // A date block also has to fit on its own date.
    if (state.block?.date != null) targets = targets.concat(overlapping(blocksOn(date)))
  } else {
    targets = overlapping(blocksOn(date))
  }
  if (targets.length === 0) return

  const ok = await run(() => removeBlocks(targets))
  if (!ok) {
    editorError.value = error.value?.message ?? 'Could not remove the overlapping blocks'
    return
  }
  const days = [...new Set(targets.map((b) => b.day_of_week ?? isoDayOfWeek(date)))].sort((a, b) => a - b)
  notice.value = `Replaced ${targets.length} overlapping ${targets.length === 1 ? 'block' : 'blocks'} on ${dayList(days)}.`
}

async function handleDragUpdate(change: GridRange & { block: ScheduleBlock }): Promise<void> {
  const { block } = change
  await run(() =>
    updateBlock(block, scopeFor(change.dayIndex, 'date'), {
      segment_id: block.segment_id,
      start_minute: change.start,
      end_minute: change.end,
      title: block.title,
      note: block.note,
    }),
  )
}

async function handleResetDay(date: Date): Promise<void> {
  await run(() => resetDay(date))
}

async function handleAddSegment(payload: CreateSegmentPayload): Promise<void> {
  await run(() => addSegments([payload]))
}

async function onboard(withTemplate: boolean): Promise<void> {
  const ok = await run(() => seedDefaults(withTemplate))
  if (ok) mode.value = 'template'
}

onMounted(async () => {
  clock = setInterval(() => {
    nowMinute.value = minuteOfDay(new Date())
  }, 60_000)
  await load(today)
})

onUnmounted(() => {
  if (clock) clearInterval(clock)
})
</script>

<style scoped>
.schedule {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  height: 100%;
  padding: var(--space-xl);
  overflow-y: auto;
}

.schedule > * {
  flex-shrink: 0;
}

.schedule__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}

.schedule__header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-md);
}

.schedule__mode {
  justify-self: start;
  display: flex;
  padding: 4px;
  border-radius: var(--radius-full);
  background-color: var(--color-gray-200);
}

.schedule__mode-btn {
  padding: var(--space-xs) var(--space-md);
  border: none;
  border-radius: var(--radius-full);
  background: none;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-600);
  cursor: pointer;
}

.schedule__mode-btn--active {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.schedule__heading {
  text-align: center;
}

.schedule__title {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.schedule__sub {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.schedule__sub-accent {
  font-family: var(--font-display);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.schedule__balance-link {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  height: 40px;
  padding: 0 var(--space-md);
  border-radius: var(--radius-full);
  background-color: var(--color-gray-200);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
  text-decoration: none;
}

.schedule__balance-link .material-symbols-outlined {
  font-size: var(--icon-size-sm);
}

.schedule__notice {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  align-self: flex-start;
  padding: var(--space-xs) var(--space-xs) var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  background-color: var(--color-status-done);
  font-size: var(--font-size-sm);
  color: var(--color-status-done-text);
}

.schedule__notice-close {
  display: flex;
  padding: 2px;
  border: none;
  border-radius: var(--radius-full);
  background: none;
  color: inherit;
  cursor: pointer;
}

.schedule__notice-close .material-symbols-outlined {
  font-size: 16px;
}

.schedule__edited {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.schedule__edited-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-xs) var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  background-color: var(--color-status-focus);
  font-size: var(--font-size-xs);
  color: var(--color-status-focus-text);
}

.schedule__edited-reset {
  padding: 2px var(--space-sm);
  border: none;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-primary);
  cursor: pointer;
}

.schedule__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: var(--space-lg);
  align-items: start;
}

.schedule__grid {
  height: min(78vh, 900px);
  min-width: 0;
}

.schedule__agenda {
  display: none;
}

.schedule__fab {
  position: fixed;
  right: var(--space-md);
  bottom: calc(144px + env(safe-area-inset-bottom));
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: var(--radius-full);
  background-color: var(--color-accent);
  box-shadow: var(--shadow-glow);
  color: var(--color-on-accent);
  cursor: pointer;
}

@media (max-width: 1100px) {
  .schedule__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .schedule {
    padding: var(--space-lg) var(--space-md);
  }

  .schedule__header {
    grid-template-columns: 1fr auto;
  }

  .schedule__heading {
    grid-column: 1 / -1;
    grid-row: 1;
    text-align: left;
  }

  .schedule__grid {
    display: none;
  }

  .schedule__agenda {
    display: block;
    padding-bottom: var(--space-2xl);
  }
}
</style>
