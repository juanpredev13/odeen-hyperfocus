<template>
  <div class="day-agenda">
    <ol class="day-agenda__rail" aria-label="Days of the week">
      <li v-for="(day, index) in days" :key="day.key">
        <button
          class="day-agenda__day"
          :class="{
            'day-agenda__day--selected': index === selectedIndex,
            'day-agenda__day--today': day.isToday,
          }"
          type="button"
          :aria-pressed="index === selectedIndex"
          @click="emit('select', index)"
        >
          <span class="day-agenda__day-name">{{ day.short }}</span>
          <span class="day-agenda__day-number">{{ day.number }}</span>
        </button>
      </li>
    </ol>

    <ol class="day-agenda__list" aria-label="Blocks">
      <template v-for="item in items" :key="item.key">
        <li v-if="item.kind === 'now'" class="day-agenda__now" aria-label="Current time">
          <span class="day-agenda__now-pill">
            <span class="day-agenda__now-dot" aria-hidden="true"></span>
            {{ formatMinutes(nowMinute) }} now
          </span>
          <span class="day-agenda__now-line" aria-hidden="true"></span>
        </li>

        <li v-else class="day-agenda__item">
          <button
            class="day-agenda__block"
            :class="[
              `day-agenda__block--${blockSize(blockMinutes(item.block))}`,
              `day-agenda__block--${segmentOf(item.block)?.color_key ?? 'slate'}`,
              { 'day-agenda__block--current': item.current },
            ]"
            type="button"
            @click="emit('edit', item.block)"
          >
            <span class="day-agenda__tag">
              <span class="material-symbols-outlined" aria-hidden="true">{{ segmentOf(item.block)?.icon ?? 'circle' }}</span>
              {{ segmentOf(item.block)?.name ?? 'Block' }}
            </span>
            <span v-if="item.current" class="day-agenda__live">
              <span class="day-agenda__now-dot" aria-hidden="true"></span>
              In progress
            </span>
            <span class="day-agenda__time">{{ formatRange(item.block) }}</span>
            <span v-if="item.block.title" class="day-agenda__title">{{ item.block.title }}</span>
            <span v-if="item.block.note" class="day-agenda__note">{{ item.block.note }}</span>
            <span v-if="item.current" class="day-agenda__remaining">{{ remaining(item.block) }} left</span>
          </button>
        </li>
      </template>

      <li v-if="blocks.length === 0" class="day-agenda__empty">
        Nothing planned for this day.
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration } from '@/modules/assistant/composables/closeDayHelpers'
import {
  blockMinutes,
  blockSize,
  formatMinutes,
  formatRange,
} from '@/modules/assistant/composables/scheduleHelpers'
import type { ScheduleBlock, ScheduleSegment } from '@/modules/assistant/types'

export interface AgendaDay {
  key: string
  short: string
  number: number
  isToday: boolean
}

type AgendaItem =
  | { kind: 'now'; key: string }
  | { kind: 'block'; key: string; block: ScheduleBlock; current: boolean }

const props = defineProps<{
  days: AgendaDay[]
  selectedIndex: number
  blocks: ScheduleBlock[]
  segments: ScheduleSegment[]
  nowMinute: number
}>()

const emit = defineEmits<{
  select: [index: number]
  edit: [block: ScheduleBlock]
}>()

const showNow = computed(() => props.days[props.selectedIndex]?.isToday ?? false)

// Blocks in order, with a "now" marker before the first block that hasn't
// started yet (or right after the running one).
const items = computed<AgendaItem[]>(() => {
  const list: AgendaItem[] = []
  let placed = !showNow.value
  for (const block of props.blocks) {
    const current = showNow.value && block.start_minute <= props.nowMinute && props.nowMinute < block.end_minute
    if (!placed && block.start_minute > props.nowMinute) {
      list.push({ kind: 'now', key: 'now' })
      placed = true
    }
    list.push({ kind: 'block', key: block.id, block, current })
    if (current && !placed) {
      list.push({ kind: 'now', key: 'now' })
      placed = true
    }
  }
  if (!placed && props.blocks.length > 0) list.push({ kind: 'now', key: 'now' })
  return list
})

function segmentOf(block: ScheduleBlock): ScheduleSegment | undefined {
  return props.segments.find((s) => s.id === block.segment_id)
}

function remaining(block: ScheduleBlock): string {
  return formatDuration(block.end_minute - props.nowMinute)
}
</script>

<style scoped>
.day-agenda {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: var(--space-md);
}

.day-agenda__rail {
  position: sticky;
  top: 0;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.day-agenda__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: var(--space-sm) 0;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  font-family: var(--font-display);
  color: var(--color-gray-500);
  cursor: pointer;
}

.day-agenda__day--today .day-agenda__day-name {
  color: var(--color-accent-strong);
}

.day-agenda__day--selected {
  background-color: var(--color-pine);
  box-shadow: var(--shadow-lg);
  color: var(--color-on-pod);
}

.day-agenda__day--selected .day-agenda__day-name {
  color: var(--color-accent);
}

.day-agenda__day-name {
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.day-agenda__day-number {
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-semibold);
}

.day-agenda__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
}

.day-agenda__block {
  --seg: var(--color-segment-slate);
  --seg-bg: var(--color-segment-slate-bg);
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--space-xs) var(--space-md);
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: left;
  color: var(--color-primary);
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.day-agenda__block:hover {
  box-shadow: var(--shadow-sm);
}

.day-agenda__block--emerald { --seg: var(--color-segment-emerald); --seg-bg: var(--color-segment-emerald-bg); }
.day-agenda__block--mint { --seg: var(--color-segment-mint); --seg-bg: var(--color-segment-mint-bg); }
.day-agenda__block--sage { --seg: var(--color-segment-sage); --seg-bg: var(--color-segment-sage-bg); }
.day-agenda__block--amber { --seg: var(--color-segment-amber); --seg-bg: var(--color-segment-amber-bg); }
.day-agenda__block--slate { --seg: var(--color-segment-slate); --seg-bg: var(--color-segment-slate-bg); }
.day-agenda__block--sky { --seg: var(--color-segment-sky); --seg-bg: var(--color-segment-sky-bg); }
.day-agenda__block--rose { --seg: var(--color-segment-rose); --seg-bg: var(--color-segment-rose-bg); }

.day-agenda__block--mini {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  background-color: var(--color-gray-100);
}

.day-agenda__block--current {
  border-color: rgba(255, 255, 255, 0.08);
  background-color: var(--color-pine);
  box-shadow: 0 0 48px -12px var(--seg);
  color: var(--color-on-pod);
}

:root[data-theme='dark'] .day-agenda__block--current {
  background-color: var(--color-pod-raised);
}

.day-agenda__tag {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  background-color: var(--seg-bg);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-primary);
}

.day-agenda__tag .material-symbols-outlined {
  font-size: 14px;
  color: var(--seg);
}

.day-agenda__block--current .day-agenda__tag {
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--color-on-pod);
}

.day-agenda__live {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-accent);
}

.day-agenda__time {
  grid-column: 2;
  grid-row: 1;
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-500);
}

.day-agenda__block--current .day-agenda__time {
  grid-row: auto;
  grid-column: 1;
  color: var(--color-on-pod-muted);
}

.day-agenda__block--mini .day-agenda__tag {
  display: none;
}

.day-agenda__block--mini .day-agenda__time {
  grid-column: 2;
  grid-row: 1;
  font-size: var(--font-size-xs);
}

.day-agenda__title {
  grid-column: 1 / -1;
  font-family: var(--font-display);
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-semibold);
  line-height: var(--leading-snug);
}

.day-agenda__block--mini .day-agenda__title {
  grid-column: 1;
  grid-row: 1;
  font-size: var(--font-size-body);
}

.day-agenda__note {
  grid-column: 1 / -1;
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.day-agenda__block--current .day-agenda__note {
  color: var(--color-on-pod-muted);
}

.day-agenda__remaining {
  grid-column: 2;
  justify-self: end;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  background-color: rgba(0, 230, 118, 0.15);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-accent);
}

.day-agenda__now {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.day-agenda__now-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  background-color: var(--color-pine);
  box-shadow: var(--shadow-glow);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.day-agenda__now-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-accent);
}

.day-agenda__now-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, var(--color-accent), transparent);
}

.day-agenda__empty {
  padding: var(--space-xl) var(--space-lg);
  border: var(--border-width) dashed var(--color-gray-300);
  border-radius: var(--radius-lg);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}
</style>
