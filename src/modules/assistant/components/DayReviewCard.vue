<template>
  <li class="day-review-card" :class="{ 'day-review-card--done': intention.done }">
    <header class="day-review-card__header">
      <span class="day-review-card__number">{{ String(intention.position).padStart(2, '0') }}</span>
      <span v-if="intention.position === 1" class="day-review-card__tag">Primary focus</span>
    </header>

    <p class="day-review-card__text">{{ intention.text }}</p>

    <footer class="day-review-card__footer">
      <div class="day-review-card__time">
        <span class="day-review-card__label">Time focused</span>
        <span class="day-review-card__value">{{ minutes === null ? '—' : formatDuration(minutes) }}</span>
      </div>

      <div class="day-review-card__actions">
        <button
          class="day-review-card__done"
          :class="{ 'day-review-card__done--on': intention.done }"
          type="button"
          :aria-pressed="intention.done"
          :disabled="busy"
          @click="emit('toggle', intention)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">check</span>
          {{ intention.done ? 'Done.' : 'Mark done' }}
        </button>

        <template v-if="!intention.done">
          <span v-if="carried" class="day-review-card__moved">
            <span class="material-symbols-outlined" aria-hidden="true">event_upcoming</span>
            On tomorrow's list
          </span>
          <button
            v-else
            class="day-review-card__carry"
            type="button"
            :disabled="busy || !canCarry"
            :title="canCarry ? undefined : 'Tomorrow already has 3 intentions'"
            @click="emit('carry', intention)"
          >
            Not today. Move to tomorrow
            <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </button>
        </template>
      </div>
    </footer>
  </li>
</template>

<script setup lang="ts">
import { formatDuration } from '@/modules/assistant/composables/closeDayHelpers'
import type { Intention } from '@/modules/assistant/types'

defineProps<{
  intention: Intention
  /** Focused minutes on the linked task; null when no task is linked. */
  minutes: number | null
  carried: boolean
  canCarry: boolean
  busy: boolean
}>()

const emit = defineEmits<{
  toggle: [intention: Intention]
  carry: [intention: Intention]
}>()
</script>

<style scoped>
.day-review-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-height: 320px;
  padding: var(--space-lg);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.day-review-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
}

.day-review-card__number {
  font-family: var(--font-display);
  font-size: 64px;
  font-weight: var(--font-weight-regular);
  line-height: 1;
  letter-spacing: var(--tracking-display);
  color: var(--color-primary);
}

.day-review-card__tag {
  padding: var(--space-xs) var(--space-sm);
  border: var(--border-width) solid var(--color-status-done);
  border-radius: var(--radius-full);
  background-color: var(--color-status-focus);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-status-focus-text);
}

.day-review-card__text {
  flex: 1;
  font-family: var(--font-display);
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-medium);
  line-height: var(--leading-snug);
  text-transform: uppercase;
  overflow-wrap: anywhere;
  color: var(--color-primary);
}

.day-review-card--done .day-review-card__text {
  text-decoration: line-through;
}

.day-review-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.day-review-card__time {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.day-review-card__label {
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.day-review-card__value {
  font-family: var(--font-display);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  color: var(--color-primary);
}

.day-review-card__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-sm);
}

.day-review-card__done {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  height: 36px;
  padding: 0 var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-primary);
  cursor: pointer;
  transition:
    background-color 0.15s,
    box-shadow 0.15s;
}

.day-review-card__done--on {
  border-color: var(--color-accent-strong);
  background-color: var(--color-accent-strong);
  color: var(--color-on-pod);
}

:root[data-theme='dark'] .day-review-card__done--on {
  color: var(--color-on-accent);
}

.day-review-card__done:hover:not(:disabled) {
  box-shadow: var(--shadow-glow);
}

.day-review-card__done .material-symbols-outlined,
.day-review-card__carry .material-symbols-outlined,
.day-review-card__moved .material-symbols-outlined {
  font-size: 16px;
}

.day-review-card__carry,
.day-review-card__moved {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.day-review-card__carry {
  cursor: pointer;
}

.day-review-card__carry:hover:not(:disabled) {
  text-decoration: underline;
}

.day-review-card__carry:disabled {
  color: var(--color-gray-400);
  cursor: not-allowed;
}

.day-review-card__moved {
  color: var(--color-gray-500);
}

@media (max-width: 767px) {
  .day-review-card {
    min-height: 0;
  }
}
</style>
