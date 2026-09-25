<template>
  <form class="session-setup" @submit.prevent="emit('start', minutes)">
    <p class="session-setup__eyebrow">Next focus session</p>
    <h1 class="session-setup__task">{{ taskTitle }}</h1>

    <fieldset class="session-setup__group">
      <legend class="session-setup__legend">How long can you focus without resistance?</legend>
      <div class="session-setup__durations">
        <button
          v-for="preset in presets"
          :key="preset"
          class="session-setup__duration"
          :class="{ 'session-setup__duration--active': minutes === preset }"
          type="button"
          :aria-pressed="minutes === preset"
          @click="minutes = preset"
        >
          {{ preset }}
          <span class="session-setup__unit">min</span>
          <span v-if="preset === suggested" class="session-setup__suggested">suggested</span>
        </button>
        <label class="session-setup__custom">
          <span class="session-setup__custom-label">Custom</span>
          <input
            v-model.number="custom"
            class="session-setup__custom-input"
            type="number"
            :min="MIN_SESSION_MINUTES"
            :max="MAX_SESSION_MINUTES"
            inputmode="numeric"
            aria-label="Custom length in minutes"
            @input="minutes = clampMinutes(custom)"
          />
        </label>
      </div>
      <p class="session-setup__nudge">
        Pick a length that feels easy to start. When time is up you can keep going.
      </p>
    </fieldset>

    <fieldset v-if="checklist.length > 0" class="session-setup__group">
      <legend class="session-setup__legend">
        Remove distractions first
        <span class="session-setup__ready">{{ checkedCount }}/{{ checklist.length }} ready</span>
      </legend>
      <ul class="session-setup__checklist">
        <li v-for="(item, i) in checklist" :key="`${i}-${item}`">
          <label class="session-setup__check">
            <input v-model="checked[i]" class="session-setup__checkbox" type="checkbox" />
            <span>{{ item }}</span>
          </label>
        </li>
      </ul>
    </fieldset>

    <p v-if="error" class="session-setup__error" role="alert">{{ error }}</p>

    <div class="session-setup__actions">
      <button class="session-setup__start" type="submit" :disabled="busy">
        <span class="material-symbols-outlined" aria-hidden="true">play_arrow</span>
        {{ allReady ? `Start ${minutes} min` : `Start ${minutes} min anyway` }}
      </button>
      <button class="session-setup__settings" type="button" @click="emit('open-settings')">
        <span class="material-symbols-outlined" aria-hidden="true">tune</span>
        Session settings
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DURATION_PRESETS,
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  clampMinutes,
} from '@/modules/focus/composables/sessionHelpers'

const props = defineProps<{
  taskTitle: string
  suggested: number
  checklist: string[]
  busy: boolean
  error?: string
}>()

const emit = defineEmits<{
  start: [minutes: number]
  'open-settings': []
}>()

const presets = computed(() =>
  DURATION_PRESETS.includes(props.suggested)
    ? DURATION_PRESETS
    : [...DURATION_PRESETS, props.suggested].sort((a, b) => a - b),
)

const minutes = ref(props.suggested)
const custom = ref(props.suggested)
const checked = ref<boolean[]>(props.checklist.map(() => false))

watch(
  () => props.suggested,
  (value) => {
    minutes.value = value
    custom.value = value
  },
)
watch(
  () => props.checklist,
  (items) => {
    checked.value = items.map(() => false)
  },
)

const checkedCount = computed(() => checked.value.filter(Boolean).length)
const allReady = computed(() => checkedCount.value === props.checklist.length)
</script>

<style scoped>
.session-setup {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  width: min(560px, 100%);
  text-align: center;
}

.session-setup__eyebrow {
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-gray-400);
}

.session-setup__task {
  margin-top: calc(-1 * var(--space-md));
  font-size: 2.5rem;
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-tight);
  color: var(--color-primary);
}

.session-setup__group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
}

.session-setup__legend {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0 auto var(--space-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-600);
}

.session-setup__ready {
  font-family: monospace;
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}

.session-setup__durations {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-sm);
}

.session-setup__duration {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: var(--space-sm) var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
  cursor: pointer;
  transition: border-color 0.15s;
}

.session-setup__duration:hover {
  border-color: var(--color-gray-400);
}

.session-setup__duration--active {
  border-color: var(--color-primary);
  box-shadow: inset 0 0 0 1px var(--color-primary);
}

.session-setup__unit {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
  color: var(--color-gray-400);
}

.session-setup__suggested {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0 var(--space-xs);
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-surface);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.session-setup__custom {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.session-setup__custom-label {
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-gray-400);
}

.session-setup__custom-input {
  width: 72px;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-sm);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background: var(--color-surface);
}

.session-setup__nudge {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.session-setup__checklist {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  text-align: left;
}

.session-setup__check {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  cursor: pointer;
}

.session-setup__checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
}

.session-setup__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}

.session-setup__actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.session-setup__start {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0.875rem 2rem;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: transform 0.1s;
}

.session-setup__start:active {
  transform: scale(0.98);
}

.session-setup__start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.session-setup__settings {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  border: none;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  cursor: pointer;
}

.session-setup__settings:hover {
  color: var(--color-primary);
}

.session-setup__settings .material-symbols-outlined {
  font-size: 16px;
}
</style>
