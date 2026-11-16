<template>
  <section class="reminders">
    <header class="reminders__header">
      <span class="material-symbols-outlined reminders__icon" aria-hidden="true">notifications</span>
      <h2 class="reminders__title">Reminders</h2>
      <span v-if="status === 'on'" class="reminders__live">On this device</span>
    </header>

    <p class="reminders__text">{{ statusText }}</p>

    <div v-if="status === 'off' || status === 'on'" class="reminders__actions">
      <button
        v-if="status === 'off'"
        class="reminders__button reminders__button--primary"
        type="button"
        :disabled="loading"
        @click="enable"
      >
        Turn on notifications
      </button>
      <button
        v-else
        class="reminders__button"
        type="button"
        :disabled="loading"
        @click="disable"
      >
        Turn off on this device
      </button>
    </div>

    <ul v-if="status === 'on'" class="reminders__list">
      <li class="reminders__item">
        <label class="reminders__toggle">
          <input
            type="checkbox"
            :checked="current.intentions_enabled"
            @change="save({ intentions_enabled: checked($event) })"
          />
          3 intentions
        </label>
        <input
          class="reminders__field"
          type="time"
          aria-label="Intentions reminder time"
          :value="current.intentions_time"
          :disabled="!current.intentions_enabled"
          @change="saveTime('intentions_time', $event)"
        />
      </li>
      <li class="reminders__item">
        <label class="reminders__toggle">
          <input
            type="checkbox"
            :checked="current.plan_tomorrow_enabled"
            @change="save({ plan_tomorrow_enabled: checked($event) })"
          />
          Plan tomorrow
        </label>
        <input
          class="reminders__field"
          type="time"
          aria-label="Plan tomorrow reminder time"
          :value="current.plan_tomorrow_time"
          :disabled="!current.plan_tomorrow_enabled"
          @change="saveTime('plan_tomorrow_time', $event)"
        />
      </li>
      <li class="reminders__item">
        <label class="reminders__toggle">
          <input
            type="checkbox"
            :checked="current.progress_enabled"
            @change="save({ progress_enabled: checked($event) })"
          />
          Project progress
        </label>
        <input
          class="reminders__field"
          type="time"
          aria-label="Project progress reminder time"
          :value="current.progress_time"
          :disabled="!current.progress_enabled"
          @change="saveTime('progress_time', $event)"
        />
      </li>
      <li class="reminders__item">
        <label class="reminders__toggle">
          <input
            type="checkbox"
            :checked="current.schedule_enabled"
            @change="save({ schedule_enabled: checked($event) })"
          />
          Schedule blocks
        </label>
        <select
          class="reminders__field"
          aria-label="Minutes before a block"
          :value="current.schedule_lead_minutes"
          :disabled="!current.schedule_enabled"
          @change="saveLead($event)"
        >
          <option v-for="m in LEAD_MINUTE_OPTIONS" :key="m" :value="m">{{ m }} min before</option>
        </select>
      </li>
    </ul>

    <p v-if="error" class="reminders__error">{{ error.message }}</p>
    <p v-if="status === 'on'" class="reminders__note">Times use {{ current.timezone }}.</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  LEAD_MINUTE_OPTIONS,
  useNotifications,
} from '@/modules/assistant/composables/useNotifications'
import type { ScheduleLeadMinutes } from '@/modules/assistant/types'

const { status, loading, error, load, save, enable, disable, effective, isInstalledApp } =
  useNotifications()

const current = computed(() => effective())

const statusText = computed(() => {
  switch (status.value) {
    case 'on':
      return 'A morning nudge for your 3 intentions, an afternoon one to plan tomorrow, an evening project digest, and a heads-up before each schedule block.'
    case 'off':
      return 'Get reminders on this device, even when ODEEN is closed.'
    case 'denied':
      return 'Notifications are blocked for ODEEN. Allow them in your browser or system settings.'
    default:
      return isInstalledApp()
        ? 'This device does not support push notifications.'
        : 'On iPhone, open ODEEN in Safari, tap Share → Add to Home Screen, then open it from the home screen to turn on reminders.'
  }
})

function checked(event: Event): boolean {
  return (event.target as HTMLInputElement).checked
}

function saveTime(field: 'intentions_time' | 'plan_tomorrow_time' | 'progress_time', event: Event): void {
  const value = (event.target as HTMLInputElement).value
  if (value) void save({ [field]: value })
}

function saveLead(event: Event): void {
  const value = Number((event.target as HTMLSelectElement).value) as ScheduleLeadMinutes
  void save({ schedule_lead_minutes: value })
}

onMounted(load)
</script>

<style scoped>
.reminders {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.reminders__header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.reminders__icon {
  font-size: var(--icon-size-lg);
  color: var(--color-primary);
}

.reminders__title {
  flex: 1;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.reminders__live {
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--color-accent-strong);
}

.reminders__text {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.reminders__actions {
  display: flex;
}

.reminders__button {
  padding: var(--space-xs) var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  cursor: pointer;
}

.reminders__button:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.reminders__button:disabled {
  opacity: 0.6;
  cursor: default;
}

.reminders__button--primary {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.reminders__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.reminders__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.reminders__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

.reminders__toggle input {
  accent-color: var(--color-accent-strong);
}

.reminders__field {
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 2px var(--space-sm);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background: var(--color-surface);
}

.reminders__field:disabled {
  opacity: 0.5;
}

.reminders__error {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
}

.reminders__note {
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}
</style>
