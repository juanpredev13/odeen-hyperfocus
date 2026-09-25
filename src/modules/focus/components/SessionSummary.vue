<template>
  <section class="session-summary" aria-labelledby="summary-title">
    <p class="session-summary__eyebrow">Session complete</p>
    <h1 id="summary-title" class="session-summary__title">
      {{ session.actual_minutes }} min focused
    </h1>

    <dl class="session-summary__stats">
      <div class="session-summary__stat">
        <dt class="session-summary__label">Planned</dt>
        <dd class="session-summary__value">{{ session.planned_minutes }} min{{ session.extended ? ' + extended' : '' }}</dd>
      </div>
      <div class="session-summary__stat">
        <dt class="session-summary__label">Refocused</dt>
        <dd class="session-summary__value">{{ session.refocus_count }}×</dd>
      </div>
      <div class="session-summary__stat">
        <dt class="session-summary__label">Thoughts parked</dt>
        <dd class="session-summary__value">{{ captures }}</dd>
      </div>
    </dl>

    <div class="session-summary__break">
      <span class="material-symbols-outlined session-summary__break-icon" aria-hidden="true">self_improvement</span>
      <p class="session-summary__break-text">
        Take a {{ breakMinutes }}-minute break<template v-if="breakActivity">: <strong>{{ breakActivity }}</strong></template>.
        Leave the phone behind and let your mind wander.
      </p>
    </div>

    <div class="session-summary__actions">
      <button class="session-summary__primary" type="button" @click="emit('again')">Start another session</button>
      <RouterLink v-if="captures > 0" class="session-summary__link" :to="{ name: 'assistant-inbox' }">
        Review parked thoughts
      </RouterLink>
      <button class="session-summary__link" type="button" @click="emit('exit')">Exit Focus Mode</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { suggestedBreakMinutes } from '@/modules/focus/composables/sessionHelpers'
import type { FocusSession } from '@/modules/focus/types'

const props = defineProps<{
  session: FocusSession
  captures: number
  breakActivity: string | null
}>()

const emit = defineEmits<{
  again: []
  exit: []
}>()

const breakMinutes = computed(() => suggestedBreakMinutes(props.session.actual_minutes ?? 0))
</script>

<style scoped>
.session-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  width: min(560px, 100%);
  text-align: center;
}

.session-summary__eyebrow {
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-gray-400);
}

.session-summary__title {
  margin-top: calc(-1 * var(--space-md));
  font-size: 3rem;
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-primary);
}

.session-summary__stats {
  display: flex;
  gap: var(--space-lg);
  margin: 0;
}

.session-summary__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.session-summary__label {
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-gray-400);
}

.session-summary__value {
  margin: 0;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.session-summary__break {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: left;
}

.session-summary__break-icon {
  color: var(--color-gray-500);
}

.session-summary__break-text {
  font-size: var(--font-size-sm);
  line-height: var(--leading-normal);
  color: var(--color-gray-600);
}

.session-summary__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
}

.session-summary__primary {
  padding: 0.75rem 1.75rem;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.session-summary__link {
  border: none;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  text-decoration: underline;
  cursor: pointer;
}

.session-summary__link:hover {
  color: var(--color-primary);
}
</style>
