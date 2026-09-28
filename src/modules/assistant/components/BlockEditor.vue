<template>
  <div class="block-editor" role="presentation" @pointerdown.self="emit('close')">
    <form
      class="block-editor__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-editor-title"
      @submit.prevent="save"
      @keydown.esc="emit('close')"
    >
      <header class="block-editor__header">
        <div>
          <p class="block-editor__eyebrow">
            <span class="block-editor__dot" aria-hidden="true"></span>
            Schedule · {{ contextLabel }}
          </p>
          <h2 id="block-editor-title" class="block-editor__title">
            {{ block ? 'Edit time block.' : 'New time block.' }}
          </h2>
        </div>
        <button class="block-editor__close" type="button" aria-label="Close" @click="emit('close')">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </header>

      <fieldset class="block-editor__field">
        <legend class="block-editor__label">Segment</legend>
        <div class="block-editor__chips">
          <label
            v-for="segment in segments"
            :key="segment.id"
            class="block-editor__chip"
            :class="{ 'block-editor__chip--active': segmentId === segment.id }"
          >
            <input v-model="segmentId" class="block-editor__radio" type="radio" :value="segment.id" />
            <span class="material-symbols-outlined" aria-hidden="true">{{ segment.icon }}</span>
            {{ segment.name }}
          </label>
        </div>
      </fieldset>

      <div class="block-editor__field">
        <span class="block-editor__label">Time (15-minute steps, 06:00–22:00)</span>
        <div class="block-editor__times">
          <div v-for="edge in EDGES" :key="edge.key" class="block-editor__time">
            <span class="block-editor__time-label">{{ edge.label }}</span>
            <output class="block-editor__time-value">{{ formatMinutes(edge.key === 'start' ? start : end) }}</output>
            <div class="block-editor__steps">
              <button
                class="block-editor__step"
                type="button"
                :aria-label="`${edge.label} 15 minutes earlier`"
                :disabled="!canStep(edge.key, -SLOT_MINUTES)"
                @click="step(edge.key, -SLOT_MINUTES)"
              >
                −15m
              </button>
              <button
                class="block-editor__step"
                type="button"
                :aria-label="`${edge.label} 15 minutes later`"
                :disabled="!canStep(edge.key, SLOT_MINUTES)"
                @click="step(edge.key, SLOT_MINUTES)"
              >
                +15m
              </button>
            </div>
          </div>
        </div>
        <p class="block-editor__summary" :class="{ 'block-editor__summary--error': overlaps }">
          <span class="block-editor__dot" aria-hidden="true"></span>
          {{ formatDuration(end - start) }} · {{ (end - start) / SLOT_MINUTES }} mini-slots
          <template v-if="overlaps"> · overlaps another block</template>
        </p>
      </div>

      <label class="block-editor__field">
        <span class="block-editor__label">Focus (optional)</span>
        <input v-model="title" class="block-editor__input" type="text" maxlength="120" placeholder="e.g. Ship the sync engine" />
      </label>

      <label class="block-editor__field">
        <span class="block-editor__label">Notes (optional)</span>
        <textarea v-model="note" class="block-editor__input block-editor__input--area" rows="2" maxlength="1000"></textarea>
      </label>

      <fieldset v-if="scopeChoice" class="block-editor__field">
        <legend class="block-editor__label">Applies to</legend>
        <div class="block-editor__scope">
          <label class="block-editor__scope-option" :class="{ 'block-editor__scope-option--active': applyTo === 'date' }">
            <input v-model="applyTo" class="block-editor__radio" type="radio" value="date" />
            This day only ({{ scopeChoice.dateLabel }})
          </label>
          <label
            class="block-editor__scope-option"
            :class="{ 'block-editor__scope-option--active': applyTo === 'template' }"
          >
            <input v-model="applyTo" class="block-editor__radio" type="radio" value="template" />
            Every {{ scopeChoice.weekday }} (template)
          </label>
        </div>
      </fieldset>

      <fieldset v-if="targetsTemplate" class="block-editor__field">
        <legend class="block-editor__label">Repeat on</legend>
        <div class="block-editor__days">
          <label
            v-for="day in WEEK"
            :key="day.id"
            class="block-editor__day"
            :class="{
              'block-editor__day--active': repeatDays.includes(day.id),
              'block-editor__day--base': day.id === baseDay,
            }"
            :title="day.id === baseDay ? `${day.name} (this block)` : day.name"
          >
            <input
              v-model="repeatDays"
              class="block-editor__radio"
              type="checkbox"
              :value="day.id"
              :disabled="day.id === baseDay"
              :aria-label="day.name"
            />
            {{ day.short }}
          </label>
        </div>
        <div class="block-editor__presets">
          <button class="block-editor__preset" type="button" @click="setRepeat(WEEKDAYS)">Weekdays</button>
          <button class="block-editor__preset" type="button" @click="setRepeat(ALL_DAYS)">Every day</button>
          <button class="block-editor__preset" type="button" @click="setRepeat([])">Only {{ baseDayName }}</button>
        </div>
        <p v-if="isDated" class="block-editor__hint">
          This day keeps its block, and it is added to the weekly template on every checked day, so it repeats
          from now on. Days where that time is taken are skipped.
        </p>
        <p v-else-if="isSeries" class="block-editor__hint">
          Changes apply to every checked day. Unchecking a day removes the block from it; days where the new time
          is taken are skipped.
        </p>
        <p v-else-if="alsoDays.length > 0" class="block-editor__hint">
          Also added to {{ alsoDays.length }} {{ alsoDays.length === 1 ? 'day' : 'days' }}. Days where it would overlap
          another block are skipped.
        </p>
      </fieldset>

      <p v-if="error" class="block-editor__error" role="alert">{{ error }}</p>

      <footer class="block-editor__footer">
        <button v-if="block" class="block-editor__delete" type="button" :disabled="busy" @click="emit('delete', applyTo, alsoDays)">
          <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          {{ alsoDays.length > 0 && !isDated ? `Delete from ${alsoDays.length + 1} days` : 'Delete block' }}
        </button>
        <span class="block-editor__spacer"></span>
        <button class="block-editor__cancel" type="button" @click="emit('close')">Cancel</button>
        <button class="block-editor__save" type="submit" :disabled="busy || !segmentId || overlaps">
          Save block
          <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
      </footer>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDuration } from '@/modules/assistant/composables/closeDayHelpers'
import {
  DAY_END_MINUTE,
  DAY_START_MINUTE,
  SLOT_MINUTES,
  WEEKDAY_NAMES,
  formatMinutes,
  overlapsAny,
} from '@/modules/assistant/composables/scheduleHelpers'
import type { BlockFields } from '@/modules/assistant/composables/useSchedule'
import type { DayOfWeek, ScheduleBlock, ScheduleSegment } from '@/modules/assistant/types'

type Edge = 'start' | 'end'
export type ApplyTo = 'date' | 'template'

const WEEKDAYS: readonly DayOfWeek[] = [1, 2, 3, 4, 5]
const ALL_DAYS: readonly DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7]
const WEEK = ALL_DAYS.map((id) => ({ id, name: WEEKDAY_NAMES[id], short: WEEKDAY_NAMES[id].slice(0, 2) }))

const EDGES: { key: Edge; label: string }[] = [
  { key: 'start', label: 'Start' },
  { key: 'end', label: 'End' },
]

const props = defineProps<{
  segments: ScheduleSegment[]
  /** The block being edited, or null for a new one. */
  block: ScheduleBlock | null
  initialStart: number
  initialEnd: number
  /** Other blocks of the same day, for the overlap check. */
  dayBlocks: ScheduleBlock[]
  contextLabel: string
  /** Offered when a template block is edited from a real week. */
  scopeChoice: { dateLabel: string; weekday: string } | null
  /** Editing the weekly template directly (not a real week). */
  templateMode: boolean
  /** Weekday of the day being edited. */
  baseDay: DayOfWeek
  /** Weekdays the block already repeats on (base day included); [] for a new block. */
  seriesDays: DayOfWeek[]
  busy: boolean
  error: string | null
}>()

const emit = defineEmits<{
  /** `alsoDays`: other weekdays to copy the block to (template only). */
  save: [fields: BlockFields, applyTo: ApplyTo, alsoDays: DayOfWeek[]]
  /** `alsoDays`: other weekdays to delete the repeated block from. */
  delete: [applyTo: ApplyTo, alsoDays: DayOfWeek[]]
  close: []
}>()

const segmentId = ref<string>(props.block?.segment_id ?? props.segments[0]?.id ?? '')
// Blocks created before the 06:00–22:00 day existed are pulled inside it.
const start = ref(Math.min(Math.max(props.initialStart, DAY_START_MINUTE), DAY_END_MINUTE - SLOT_MINUTES))
const end = ref(Math.max(Math.min(props.initialEnd, DAY_END_MINUTE), start.value + SLOT_MINUTES))
const title = ref(props.block?.title ?? '')
const note = ref(props.block?.note ?? '')
const applyTo = ref<ApplyTo>('date')
const repeatDays = ref<DayOfWeek[]>(props.seriesDays.length > 0 ? [...props.seriesDays] : [props.baseDay])
const isSeries = computed(() => props.block !== null && props.seriesDays.length > 0)
const isDated = computed(() => props.block !== null && props.block.date !== null)

const targetsTemplate = computed(
  () => props.templateMode || (props.scopeChoice !== null && applyTo.value === 'template'),
)
const baseDayName = computed(() => WEEKDAY_NAMES[props.baseDay])
const alsoDays = computed(() =>
  targetsTemplate.value ? repeatDays.value.filter((d) => d !== props.baseDay).sort((a, b) => a - b) : [],
)

function setRepeat(days: readonly DayOfWeek[]): void {
  repeatDays.value = [...new Set<DayOfWeek>([props.baseDay, ...days])]
}

const overlaps = computed(() =>
  overlapsAny(props.dayBlocks, { start_minute: start.value, end_minute: end.value }, props.block?.id ?? null),
)

function canStep(edge: Edge, delta: number): boolean {
  if (edge === 'start') {
    const next = start.value + delta
    return next >= DAY_START_MINUTE && next < end.value
  }
  const next = end.value + delta
  return next <= DAY_END_MINUTE && next > start.value
}

function step(edge: Edge, delta: number): void {
  if (!canStep(edge, delta)) return
  if (edge === 'start') start.value += delta
  else end.value += delta
}

function save(): void {
  if (!segmentId.value || overlaps.value) return
  emit(
    'save',
    {
      segment_id: segmentId.value,
      start_minute: start.value,
      end_minute: end.value,
      title: title.value,
      note: note.value,
    },
    applyTo.value,
    alsoDays.value,
  )
}
</script>

<style scoped>
.block-editor {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  background-color: rgba(11, 17, 14, 0.55);
  backdrop-filter: blur(6px);
}

.block-editor__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: min(520px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: var(--space-lg);
  border: var(--border-width) solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  background-color: var(--color-pine);
  background-image: radial-gradient(90% 60% at 50% 0%, rgba(0, 230, 118, 0.12), rgba(10, 47, 29, 0) 70%);
  box-shadow: var(--shadow-pod);
  color: var(--color-on-pod);
}

:root[data-theme='dark'] .block-editor__panel {
  background-color: var(--color-pod);
}

.block-editor__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.block-editor__eyebrow,
.block-editor__label,
.block-editor__time-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-on-pod-muted);
}

.block-editor__eyebrow {
  color: var(--color-accent);
}

.block-editor__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-accent);
}

.block-editor__title {
  margin-top: var(--space-xs);
  font-family: var(--font-display);
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-semibold);
  color: var(--color-on-pod);
}

.block-editor__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-full);
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--color-on-pod);
  cursor: pointer;
}

.block-editor__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
  border: none;
  padding: 0;
  margin: 0;
}

.block-editor__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.block-editor__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  height: 32px;
  padding: 0 var(--space-md);
  border: var(--border-width) solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  background-color: rgba(255, 255, 255, 0.05);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-on-pod);
  cursor: pointer;
}

.block-editor__chip .material-symbols-outlined {
  font-size: 16px;
}

.block-editor__chip:has(.block-editor__radio:focus-visible) {
  outline: 2px solid var(--color-mint);
  outline-offset: 2px;
}

.block-editor__chip--active {
  border-color: var(--color-accent);
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}

.block-editor__radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.block-editor__times {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.block-editor__time {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: var(--border-width) solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  background-color: rgba(255, 255, 255, 0.04);
}

.block-editor__time-value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-on-pod);
}

.block-editor__steps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xs);
}

.block-editor__step {
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background-color: rgba(255, 255, 255, 0.1);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-on-pod);
  cursor: pointer;
}

.block-editor__step:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.block-editor__summary {
  display: inline-flex;
  align-items: center;
  align-self: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  background-color: rgba(255, 255, 255, 0.08);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.block-editor__summary--error {
  background-color: var(--color-danger);
}

.block-editor__input {
  width: 100%;
  min-height: 44px;
  padding: var(--space-sm) var(--space-md);
  border: var(--border-width) solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-md);
  background-color: rgba(255, 255, 255, 0.05);
  font-family: var(--font-family);
  font-size: var(--font-size-body);
  color: var(--color-on-pod);
}

.block-editor__input::placeholder {
  color: var(--color-on-pod-muted);
}

.block-editor__input:focus {
  outline: none;
  border-color: var(--color-mint);
  box-shadow: var(--focus-ring);
}

.block-editor__input--area {
  resize: vertical;
}

.block-editor__scope {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: var(--space-sm);
  padding: 4px;
  border-radius: var(--radius-md);
  background-color: rgba(255, 255, 255, 0.05);
}

.block-editor__scope-option {
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-align: center;
  color: var(--color-on-pod-muted);
  cursor: pointer;
}

.block-editor__scope-option--active {
  background-color: rgba(255, 255, 255, 0.12);
  color: var(--color-on-pod);
}

.block-editor__days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.block-editor__day {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border: var(--border-width) solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  background-color: rgba(255, 255, 255, 0.05);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-on-pod-muted);
  cursor: pointer;
}

.block-editor__day:has(.block-editor__radio:focus-visible) {
  outline: 2px solid var(--color-mint);
  outline-offset: 2px;
}

.block-editor__day--active {
  border-color: var(--color-accent);
  background-color: rgba(0, 230, 118, 0.18);
  color: var(--color-on-pod);
}

.block-editor__day--base {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
  cursor: default;
}

.block-editor__presets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.block-editor__preset {
  padding: var(--space-xs) var(--space-md);
  border: var(--border-width) solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-full);
  background: none;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-on-pod);
  cursor: pointer;
}

.block-editor__preset:hover {
  border-color: var(--color-accent);
}

.block-editor__hint {
  font-size: var(--font-size-xs);
  color: var(--color-on-pod-muted);
}

.block-editor__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger-on-pod);
}

.block-editor__footer {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
  padding-top: var(--space-md);
  border-top: var(--border-width) solid rgba(255, 255, 255, 0.08);
}

.block-editor__spacer {
  flex: 1;
}

.block-editor__delete,
.block-editor__cancel,
.block-editor__save {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  height: 40px;
  padding: 0 var(--space-md);
  border: none;
  border-radius: var(--radius-full);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.block-editor__delete {
  padding: 0;
  background: none;
  color: var(--color-danger-on-pod);
}

.block-editor__delete .material-symbols-outlined,
.block-editor__save .material-symbols-outlined {
  font-size: 16px;
}

.block-editor__cancel {
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--color-on-pod);
}

.block-editor__save {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}

.block-editor__save:hover:not(:disabled) {
  box-shadow: var(--shadow-glow);
}

.block-editor__save:disabled,
.block-editor__delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .block-editor {
    align-items: flex-end;
    padding: 0;
  }

  .block-editor__panel {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .block-editor__scope {
    grid-template-columns: 1fr;
  }
}
</style>
