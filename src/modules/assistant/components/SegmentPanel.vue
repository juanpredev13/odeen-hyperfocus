<template>
  <section class="segment-panel" aria-labelledby="segment-panel-title">
    <header class="segment-panel__header">
      <h2 id="segment-panel-title" class="segment-panel__title">
        Weekly segments
        <span class="segment-panel__count">{{ rows.length }}</span>
      </h2>
      <p class="segment-panel__sub">Planned hours per segment in this {{ scopeLabel }}.</p>
    </header>

    <ul class="segment-panel__list">
      <li v-for="(row, index) in rows" :key="row.segment.id" class="segment-panel__row">
        <span class="segment-panel__dot" :class="`segment-panel__dot--${row.segment.color_key}`" aria-hidden="true"></span>

        <div class="segment-panel__info">
          <input
            v-if="editingId === row.segment.id"
            ref="renameInput"
            v-model="draftName"
            class="segment-panel__rename"
            type="text"
            maxlength="40"
            :aria-label="`Rename ${row.segment.name}`"
            @keydown.enter.prevent="commitRename(row.segment)"
            @keydown.esc="editingId = null"
            @blur="commitRename(row.segment)"
          />
          <button v-else class="segment-panel__name" type="button" title="Rename" @click="startRename(row.segment)">
            {{ row.segment.name }}
          </button>
          <span class="segment-panel__meta">{{ row.blocks }} {{ row.blocks === 1 ? 'block' : 'blocks' }}</span>
        </div>

        <div class="segment-panel__hours">
          <span class="segment-panel__value">{{ hours(row.minutes) }}</span>
          <span class="segment-panel__share">{{ share(row.minutes) }}</span>
        </div>

        <div class="segment-panel__order">
          <button
            class="segment-panel__icon-btn"
            type="button"
            :disabled="index === 0 || busy"
            :aria-label="`Move ${row.segment.name} up`"
            @click="emit('move', row.segment.id, -1)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">keyboard_arrow_up</span>
          </button>
          <button
            class="segment-panel__icon-btn"
            type="button"
            :disabled="index === rows.length - 1 || busy"
            :aria-label="`Move ${row.segment.name} down`"
            @click="emit('move', row.segment.id, 1)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">keyboard_arrow_down</span>
          </button>
          <button
            class="segment-panel__icon-btn"
            type="button"
            :disabled="busy"
            :aria-label="`Archive ${row.segment.name}`"
            title="Archive"
            @click="emit('archive', row.segment)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">archive</span>
          </button>
        </div>
      </li>
    </ul>

    <form class="segment-panel__add" @submit.prevent="add">
      <input
        v-model="newName"
        class="segment-panel__input"
        type="text"
        maxlength="40"
        placeholder="New segment"
        aria-label="New segment name"
      />
      <select v-model="newColor" class="segment-panel__select" aria-label="Color">
        <option v-for="color in SEGMENT_COLORS" :key="color" :value="color">Color: {{ color }}</option>
      </select>
      <select v-model="newIcon" class="segment-panel__select" aria-label="Icon">
        <option v-for="icon in SEGMENT_ICONS" :key="icon" :value="icon">Icon: {{ icon.replace(/_/g, ' ') }}</option>
      </select>
      <button class="segment-panel__add-btn" type="submit" :disabled="busy || !newName.trim()">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        Add
      </button>
    </form>

    <footer class="segment-panel__load">
      <div class="segment-panel__load-row">
        <span class="segment-panel__load-label">Planned</span>
        <span class="segment-panel__load-value">{{ hours(totalMinutes) }} / 168h</span>
      </div>
      <div class="segment-panel__bar" aria-hidden="true">
        <span class="segment-panel__bar-fill"></span>
      </div>
      <p class="segment-panel__free">{{ hours(freeMinutes) }} unplanned</p>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { SEGMENT_COLORS, SEGMENT_ICONS } from '@/modules/assistant/composables/scheduleHelpers'
import type { CreateSegmentPayload, ScheduleSegment, SegmentColor } from '@/modules/assistant/types'

const WEEK_MINUTES = 7 * 24 * 60

const props = defineProps<{
  segments: ScheduleSegment[]
  plannedMinutes: Map<string, number>
  blockCounts: Map<string, number>
  scopeLabel: string
  busy: boolean
}>()

const emit = defineEmits<{
  add: [payload: CreateSegmentPayload]
  rename: [segment: ScheduleSegment, name: string]
  move: [id: string, direction: -1 | 1]
  archive: [segment: ScheduleSegment]
}>()

const rows = computed(() =>
  props.segments.map((segment) => ({
    segment,
    minutes: props.plannedMinutes.get(segment.id) ?? 0,
    blocks: props.blockCounts.get(segment.id) ?? 0,
  })),
)

const totalMinutes = computed(() => rows.value.reduce((sum, r) => sum + r.minutes, 0))
const freeMinutes = computed(() => Math.max(0, WEEK_MINUTES - totalMinutes.value))
const loadPercent = computed(() => `${Math.min(100, (totalMinutes.value / WEEK_MINUTES) * 100)}%`)

const newName = ref('')
const newColor = ref<SegmentColor>('sky')
const newIcon = ref('self_improvement')

const editingId = ref<string | null>(null)
const draftName = ref('')
const renameInput = ref<HTMLInputElement[]>([])

function hours(minutes: number): string {
  const h = minutes / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`
}

function share(minutes: number): string {
  return `${((minutes / WEEK_MINUTES) * 100).toFixed(1)}%`
}

function add(): void {
  const name = newName.value.trim()
  if (!name) return
  const position = props.segments.reduce((max, s) => Math.max(max, s.position), -1) + 1
  emit('add', { name, color_key: newColor.value, icon: newIcon.value, position })
  newName.value = ''
}

async function startRename(segment: ScheduleSegment): Promise<void> {
  editingId.value = segment.id
  draftName.value = segment.name
  await nextTick()
  renameInput.value[0]?.focus()
}

function commitRename(segment: ScheduleSegment): void {
  if (editingId.value !== segment.id) return
  editingId.value = null
  const name = draftName.value.trim()
  if (name && name !== segment.name) emit('rename', segment, name)
}
</script>

<style scoped>
.segment-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.segment-panel__title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.segment-panel__count {
  padding: 0 var(--space-sm);
  border-radius: var(--radius-full);
  background-color: var(--color-gray-200);
  font-size: var(--font-size-xs);
}

.segment-panel__sub {
  margin-top: var(--space-xs);
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.segment-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.segment-panel__row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  background-color: var(--color-gray-100);
}

.segment-panel__dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
}

.segment-panel__dot--emerald { background-color: var(--color-segment-emerald); }
.segment-panel__dot--mint { background-color: var(--color-segment-mint); }
.segment-panel__dot--sage { background-color: var(--color-segment-sage); }
.segment-panel__dot--amber { background-color: var(--color-segment-amber); }
.segment-panel__dot--slate { background-color: var(--color-segment-slate); }
.segment-panel__dot--sky { background-color: var(--color-segment-sky); }
.segment-panel__dot--rose { background-color: var(--color-segment-rose); }

.segment-panel__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.segment-panel__name {
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  font-family: var(--font-display);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
  cursor: text;
}

.segment-panel__rename,
.segment-panel__input,
.segment-panel__select {
  min-width: 0;
  height: 32px;
  padding: 0 var(--space-sm);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

.segment-panel__meta,
.segment-panel__share {
  font-size: var(--font-size-xxs);
  color: var(--color-gray-500);
}

.segment-panel__hours {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.segment-panel__value {
  font-family: var(--font-display);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent-strong);
}

.segment-panel__order {
  display: flex;
  flex-direction: column;
}

.segment-panel__icon-btn {
  display: flex;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-gray-500);
  cursor: pointer;
}

.segment-panel__icon-btn .material-symbols-outlined {
  font-size: 16px;
}

.segment-panel__icon-btn:hover:not(:disabled) {
  color: var(--color-primary);
}

.segment-panel__icon-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.segment-panel__add {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: var(--space-xs);
}

.segment-panel__add .segment-panel__input {
  grid-column: 1 / -1;
}

.segment-panel__add-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  padding: 0 var(--space-md);
  border: none;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-surface);
  cursor: pointer;
}

.segment-panel__add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.segment-panel__add-btn .material-symbols-outlined {
  font-size: 16px;
}

.segment-panel__load {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-md);
  border-top: var(--border-width) solid var(--border-color);
}

.segment-panel__load-row {
  display: flex;
  justify-content: space-between;
}

.segment-panel__load-label {
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.segment-panel__load-value {
  font-family: var(--font-display);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent-strong);
}

.segment-panel__bar {
  display: flex;
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background-color: var(--color-gray-200);
}

.segment-panel__bar-fill {
  width: v-bind(loadPercent);
  background-color: var(--color-mint);
}

.segment-panel__free {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}
</style>
