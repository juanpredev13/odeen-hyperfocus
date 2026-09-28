<template>
  <div class="week-grid">
    <div class="week-grid__head">
      <span class="week-grid__corner">{{ timeZoneLabel }}</span>
      <div
        v-for="day in days"
        :key="day.key"
        class="week-grid__day-head"
        :class="{ 'week-grid__day-head--today': day.isToday }"
      >
        <span class="week-grid__day-name">
          {{ day.label }}
          <span v-if="day.isToday" class="week-grid__today-dot" aria-hidden="true"></span>
        </span>
        <span class="week-grid__day-sub">{{ day.sub }}</span>
      </div>
    </div>

    <div class="week-grid__body">
      <ol class="week-grid__hours" aria-hidden="true">
        <li v-for="hour in HOURS" :key="hour" class="week-grid__hour">
          {{ formatMinutes(hour * 60) }}
        </li>
      </ol>

      <div
        v-for="(day, dayIndex) in days"
        :key="day.key"
        :ref="(el) => setColumn(el, dayIndex)"
        class="week-grid__column"
        :class="{ 'week-grid__column--today': day.isToday }"
        :aria-label="`${day.label} — drag to add a block`"
        @pointerdown="startCreate($event, dayIndex)"
      >
        <ScheduleBlockCard
          v-for="block in visibleBlocks(day)"
          v-show="drag?.blockId !== block.id"
          :key="block.id"
          :block="block"
          :segment="segmentById(block.segment_id)"
          :px-per-minute="PX_PER_MINUTE"
          :origin-minute="DAY_START_MINUTE"
          :current="day.isToday && block.start_minute <= nowMinute && nowMinute < block.end_minute"
          @gesture="(gesture, event) => startBlockGesture(event, gesture, dayIndex, block)"
          @edit="emit('edit', { dayIndex, block })"
        />

        <ScheduleBlockCard
          v-if="drag && drag.dayIndex === dayIndex"
          ghost
          :invalid="dragOverlaps"
          :block="{ start_minute: drag.start, end_minute: drag.end, title: drag.title, note: null }"
          :segment="drag.segmentId ? segmentById(drag.segmentId) : undefined"
          :px-per-minute="PX_PER_MINUTE"
          :origin-minute="DAY_START_MINUTE"
        />

        <div v-if="day.isToday && nowVisible" class="week-grid__now" aria-hidden="true"></div>
      </div>
    </div>

    <p v-if="drag" class="week-grid__tip" role="status">
      {{ formatMinutes(drag.start) }} – {{ formatMinutes(drag.end) }}
      ({{ formatDuration(drag.end - drag.start) }}) · snap 15m
      <template v-if="dragOverlaps"> · overlaps</template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type ComponentPublicInstance } from 'vue'
import ScheduleBlockCard, { type BlockGesture } from '@/modules/assistant/components/ScheduleBlockCard.vue'
import { formatDuration } from '@/modules/assistant/composables/closeDayHelpers'
import {
  DAY_END_MINUTE,
  DAY_START_MINUTE,
  SLOT_MINUTES,
  formatMinutes,
  overlapsAny,
  snapMinutes,
} from '@/modules/assistant/composables/scheduleHelpers'
import type { ScheduleBlock, ScheduleSegment } from '@/modules/assistant/types'

export interface GridDay {
  key: string
  label: string
  sub: string
  isToday: boolean
  blocks: ScheduleBlock[]
}

export interface GridRange {
  dayIndex: number
  start: number
  end: number
}

const HOUR_PX = 72
const PX_PER_MINUTE = HOUR_PX / 60
const FIRST_HOUR = DAY_START_MINUTE / 60
const HOURS = Array.from({ length: (DAY_END_MINUTE - DAY_START_MINUTE) / 60 }, (_, i) => FIRST_HOUR + i)
/** Pointer travel (px) before a press on a block counts as a drag, not a click. */
const DRAG_THRESHOLD = 4

const props = defineProps<{
  days: GridDay[]
  segments: ScheduleSegment[]
  nowMinute: number
}>()

const emit = defineEmits<{
  create: [range: GridRange]
  update: [change: GridRange & { block: ScheduleBlock }]
  edit: [target: { dayIndex: number; block: ScheduleBlock }]
}>()

interface DragState {
  gesture: BlockGesture | 'create'
  dayIndex: number
  blockId: string | null
  segmentId: string | null
  title: string | null
  /** Minute under the pointer at press time, and the block's range then. */
  anchor: number
  originStart: number
  originEnd: number
  start: number
  end: number
  startY: number
  moved: boolean
}

const columns: HTMLElement[] = []
const drag = ref<DragState | null>(null)

const timeZoneLabel = (() => {
  const offset = -new Date().getTimezoneOffset() / 60
  return `UTC${offset >= 0 ? '+' : ''}${offset}`
})()

const nowVisible = computed(() => props.nowMinute >= DAY_START_MINUTE && props.nowMinute < DAY_END_MINUTE)
const nowTop = computed(() => `${(props.nowMinute - DAY_START_MINUTE) * PX_PER_MINUTE}px`)
const dayHeight = `${(DAY_END_MINUTE - DAY_START_MINUTE) * PX_PER_MINUTE}px`
const hourHeight = `${HOUR_PX}px`
const slotHeight = `${SLOT_MINUTES * PX_PER_MINUTE}px`

const dragOverlaps = computed(() => {
  const d = drag.value
  if (!d) return false
  const day = props.days[d.dayIndex]
  return day ? overlapsAny(day.blocks, { start_minute: d.start, end_minute: d.end }, d.blockId) : false
})

/** Blocks that overlap the planned day; anything fully outside it is not drawn. */
function visibleBlocks(day: GridDay): ScheduleBlock[] {
  return day.blocks.filter((b) => b.end_minute > DAY_START_MINUTE && b.start_minute < DAY_END_MINUTE)
}

function segmentById(id: string): ScheduleSegment | undefined {
  return props.segments.find((s) => s.id === id)
}

function setColumn(el: Element | ComponentPublicInstance | null, index: number): void {
  if (el instanceof HTMLElement) columns[index] = el
}

function minuteAt(clientY: number, dayIndex: number): number {
  const column = columns[dayIndex]
  if (!column) return 0
  return DAY_START_MINUTE + (clientY - column.getBoundingClientRect().top) / PX_PER_MINUTE
}

function floorToSlot(minute: number): number {
  return Math.min(
    DAY_END_MINUTE - SLOT_MINUTES,
    Math.max(DAY_START_MINUTE, Math.floor(minute / SLOT_MINUTES) * SLOT_MINUTES),
  )
}

function begin(event: PointerEvent, state: DragState): void {
  const column = columns[state.dayIndex]
  column?.setPointerCapture(event.pointerId)
  drag.value = state
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', cancel)
}

function startCreate(event: PointerEvent, dayIndex: number): void {
  if (event.button !== 0 || event.target !== event.currentTarget) return
  event.preventDefault()
  const slot = floorToSlot(minuteAt(event.clientY, dayIndex))
  begin(event, {
    gesture: 'create',
    dayIndex,
    blockId: null,
    segmentId: null,
    title: null,
    anchor: slot,
    originStart: slot,
    originEnd: slot + SLOT_MINUTES,
    start: slot,
    end: slot + SLOT_MINUTES,
    startY: event.clientY,
    moved: false,
  })
}

function startBlockGesture(event: PointerEvent, gesture: BlockGesture, dayIndex: number, block: ScheduleBlock): void {
  event.preventDefault()
  begin(event, {
    gesture,
    dayIndex,
    blockId: block.id,
    segmentId: block.segment_id,
    title: block.title,
    anchor: minuteAt(event.clientY, dayIndex),
    originStart: block.start_minute,
    originEnd: block.end_minute,
    start: block.start_minute,
    end: block.end_minute,
    startY: event.clientY,
    moved: false,
  })
}

function onMove(event: PointerEvent): void {
  const d = drag.value
  if (!d) return
  if (!d.moved && Math.abs(event.clientY - d.startY) < DRAG_THRESHOLD) return
  d.moved = true

  const minute = minuteAt(event.clientY, d.dayIndex)
  const length = d.originEnd - d.originStart

  if (d.gesture === 'create') {
    const slot = floorToSlot(minute)
    d.start = Math.min(d.anchor, slot)
    d.end = Math.max(d.anchor, slot) + SLOT_MINUTES
  } else if (d.gesture === 'move') {
    const start = Math.max(DAY_START_MINUTE, snapMinutes(d.originStart + (minute - d.anchor)))
    d.start = Math.min(start, DAY_END_MINUTE - length)
    d.end = d.start + length
  } else if (d.gesture === 'resize-start') {
    d.start = Math.max(DAY_START_MINUTE, Math.min(snapMinutes(minute), d.originEnd - SLOT_MINUTES))
  } else {
    d.end = Math.min(DAY_END_MINUTE, Math.max(snapMinutes(minute), d.originStart + SLOT_MINUTES))
  }
}

function finish(): DragState | null {
  const d = drag.value
  drag.value = null
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', cancel)
  return d
}

function onUp(): void {
  const overlapping = dragOverlaps.value
  const d = finish()
  if (!d) return

  const day = props.days[d.dayIndex]
  const block = d.blockId ? day?.blocks.find((b) => b.id === d.blockId) : undefined

  if (d.gesture === 'create') {
    if (!overlapping) emit('create', { dayIndex: d.dayIndex, start: d.start, end: d.end })
    return
  }
  if (!block) return
  if (!d.moved) {
    emit('edit', { dayIndex: d.dayIndex, block })
    return
  }
  const changed = d.start !== d.originStart || d.end !== d.originEnd
  if (changed && !overlapping) emit('update', { dayIndex: d.dayIndex, start: d.start, end: d.end, block })
}

function cancel(): void {
  finish()
}

</script>

<style scoped>
.week-grid {
  position: relative;
  height: 100%;
  overflow: auto;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.week-grid__head {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: 64px repeat(7, minmax(96px, 1fr));
  border-bottom: var(--border-width) solid var(--border-color);
  background-color: var(--color-surface);
}

.week-grid__corner {
  align-self: center;
  justify-self: center;
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-500);
}

.week-grid__day-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-md) var(--space-xs);
}

.week-grid__day-name {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-display);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.week-grid__day-head--today .week-grid__day-name {
  color: var(--color-accent-strong);
}

.week-grid__today-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-accent);
}

.week-grid__day-sub {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.week-grid__body {
  display: grid;
  grid-template-columns: 64px repeat(7, minmax(96px, 1fr));
}

.week-grid__hours {
  display: flex;
  flex-direction: column;
}

.week-grid__hour {
  height: v-bind(hourHeight);
  padding: 0 var(--space-sm);
  transform: translateY(-0.6em);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-medium);
  text-align: right;
  color: var(--color-gray-500);
}

.week-grid__hour:first-child {
  transform: none;
}

/* Hour lines (strong) over quarter-hour mini-slot lines (faint). */
.week-grid__column {
  position: relative;
  height: v-bind(dayHeight);
  border-left: var(--border-width) solid var(--border-color);
  background-image:
    repeating-linear-gradient(
      to bottom,
      var(--border-color) 0 1px,
      transparent 1px v-bind(hourHeight)
    ),
    repeating-linear-gradient(
      to bottom,
      color-mix(in srgb, var(--border-color) 45%, transparent) 0 1px,
      transparent 1px v-bind(slotHeight)
    );
  cursor: crosshair;
  touch-action: none;
}

.week-grid__column--today {
  background-color: color-mix(in srgb, var(--color-accent) 4%, transparent);
}

.week-grid__now {
  position: absolute;
  top: v-bind(nowTop);
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--color-accent);
  box-shadow: var(--shadow-glow);
  pointer-events: none;
  z-index: 4;
}

.week-grid__tip {
  position: sticky;
  bottom: var(--space-md);
  left: 50%;
  z-index: 6;
  width: max-content;
  margin: 0 auto;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  background-color: var(--color-pod);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-accent);
  pointer-events: none;
}
</style>
