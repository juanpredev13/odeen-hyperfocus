<template>
  <div
    class="schedule-block"
    :class="[
      `schedule-block--${size}`,
      {
        'schedule-block--ghost': ghost,
        'schedule-block--invalid': invalid,
        'schedule-block--current': current,
      },
    ]"
    role="button"
    tabindex="0"
    :aria-label="`${segment?.name ?? 'Block'}${block.title ? `: ${block.title}` : ''}, ${range}`"
    :title="ghost ? undefined : tooltip"
    @pointerdown="onPointerDown($event, 'move')"
    @keydown.enter.prevent="emit('edit')"
    @keydown.space.prevent="emit('edit')"
  >
    <span
      v-if="!ghost"
      class="schedule-block__handle schedule-block__handle--start"
      aria-hidden="true"
      @pointerdown.stop="onPointerDown($event, 'resize-start')"
    ></span>

    <div class="schedule-block__row">
      <span class="material-symbols-outlined schedule-block__icon" aria-hidden="true">
        {{ segment?.icon ?? 'circle' }}
      </span>
      <span v-if="size === 'mini'" class="schedule-block__inline-title">{{ block.title ?? segment?.name }}</span>
      <span class="schedule-block__time">{{ shortRange }}</span>
    </div>

    <p v-if="size !== 'mini' && block.title" class="schedule-block__title">{{ block.title }}</p>
    <p v-if="size === 'full' && block.note" class="schedule-block__note">{{ block.note }}</p>
    <span v-if="size === 'full'" class="schedule-block__duration">{{ duration }}</span>

    <span
      v-if="!ghost"
      class="schedule-block__handle schedule-block__handle--end"
      aria-hidden="true"
      @pointerdown.stop="onPointerDown($event, 'resize-end')"
    ></span>
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

export type BlockGesture = 'move' | 'resize-start' | 'resize-end'

const props = withDefaults(
  defineProps<{
    block: Pick<ScheduleBlock, 'start_minute' | 'end_minute' | 'title' | 'note'>
    segment: ScheduleSegment | undefined
    pxPerMinute: number
    /** Minute shown at the top of the column (the grid's first hour). */
    originMinute?: number
    ghost?: boolean
    invalid?: boolean
    current?: boolean
  }>(),
  { originMinute: 0, ghost: false, invalid: false, current: false },
)

const emit = defineEmits<{
  gesture: [gesture: BlockGesture, event: PointerEvent]
  edit: []
}>()

const minutes = computed(() => blockMinutes(props.block))
const size = computed(() => blockSize(minutes.value))
const range = computed(() => formatRange(props.block))
const shortRange = computed(() => `${formatMinutes(props.block.start_minute)}–${formatMinutes(props.block.end_minute)}`)
const duration = computed(() => formatDuration(minutes.value))
const tooltip = computed(() =>
  [`${props.block.title ?? props.segment?.name ?? 'Block'} · ${range.value}`, props.block.note]
    .filter(Boolean)
    .join('\n'),
)

// Geometry and color are data-driven, so they are bound as CSS variables.
const top = computed(() => `${(props.block.start_minute - props.originMinute) * props.pxPerMinute}px`)
const height = computed(() => `${minutes.value * props.pxPerMinute}px`)
const color = computed(() => `var(--color-segment-${props.segment?.color_key ?? 'slate'})`)
const tint = computed(() => `var(--color-segment-${props.segment?.color_key ?? 'slate'}-bg)`)

function onPointerDown(event: PointerEvent, gesture: BlockGesture): void {
  if (props.ghost || event.button !== 0) return
  emit('gesture', gesture, event)
}
</script>

<style scoped>
.schedule-block {
  position: absolute;
  top: v-bind(top);
  left: 4px;
  right: 4px;
  height: v-bind(height);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px var(--space-sm);
  border: var(--border-width) solid color-mix(in srgb, v-bind(color) 35%, transparent);
  border-left: 3px solid v-bind(color);
  border-radius: var(--radius-sm);
  background-color: v-bind(tint);
  color: var(--color-primary);
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: box-shadow 0.15s;
}

.schedule-block:hover,
.schedule-block:focus-visible {
  box-shadow: var(--shadow-sm);
  z-index: 2;
}

.schedule-block--short,
.schedule-block--full {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
}

.schedule-block--current {
  box-shadow: 0 0 24px -6px v-bind(color);
}

.schedule-block--ghost {
  border-style: dashed;
  opacity: 0.85;
  pointer-events: none;
  z-index: 3;
}

.schedule-block--invalid {
  border-color: var(--color-danger);
  background-color: var(--color-danger-bg);
}

.schedule-block__row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
  line-height: 1;
}

.schedule-block--mini .schedule-block__row {
  height: 100%;
}

.schedule-block__icon {
  flex-shrink: 0;
  font-size: 13px;
  color: v-bind(color);
}

.schedule-block__time,
.schedule-block__duration {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.schedule-block__time {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.02em;
  color: var(--color-gray-600);
}

/* 15-minute blocks: one row, title first. The time only shows when the
   column is wide enough — its position on the grid and the tooltip give it. */
.schedule-block--mini {
  container-type: inline-size;
}

.schedule-block--mini .schedule-block__time {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 9px;
}

@container (max-width: 180px) {
  .schedule-block--mini .schedule-block__time {
    display: none;
  }
}

.schedule-block__inline-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.schedule-block__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.25;
}

.schedule-block--full .schedule-block__title {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.schedule-block__note {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-xxs);
  color: var(--color-gray-500);
}

.schedule-block__duration {
  margin-top: auto;
  color: var(--color-gray-500);
}

.schedule-block__handle {
  position: absolute;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}

.schedule-block__handle--start {
  top: 0;
}

.schedule-block__handle--end {
  bottom: 0;
}
</style>
