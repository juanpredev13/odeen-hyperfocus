<template>
  <div class="close-day">
    <AssistantNav />

    <section class="close-day__hero" aria-labelledby="close-day-title">
      <svg class="close-day__art" viewBox="0 0 1200 320" preserveAspectRatio="none" aria-hidden="true">
        <path class="close-day__wave" d="M0 250 C 200 60, 420 60, 600 170 S 1000 330, 1200 110" />
        <path class="close-day__wave close-day__wave--dashed" d="M0 190 C 240 40, 520 300, 760 120 S 1080 40, 1200 260" />
      </svg>

      <p class="close-day__eyebrow">
        <span class="close-day__dot" aria-hidden="true"></span>
        End-of-day ritual · {{ dateLabel }}
      </p>
      <h1 id="close-day-title" class="close-day__title">
        How <span class="close-day__badge">did</span> today go?
      </h1>
      <p class="close-day__lede">Close open loops, decide what carries over, and leave work at work.</p>
    </section>

    <p v-if="errorMessage" class="close-day__error" role="alert">{{ errorMessage }}</p>

    <template v-if="today.length > 0">
      <h2 class="close-day__summary">
        {{ stats.done }} of {{ stats.total }} done.
        <span class="close-day__summary-accent">{{ formatDuration(totalMinutes) }}</span>
        of real focus.
      </h2>

      <ol class="close-day__grid" aria-label="Today's intentions">
        <DayReviewCard
          v-for="intention in today"
          :key="intention.id"
          :intention="intention"
          :minutes="intention.task_id ? minutesFor(intention.task_id) : null"
          :carried="isCarriedOver(intention, tomorrow)"
          :can-carry="tomorrow.length < MAX"
          :busy="busy"
          @toggle="handleToggle"
          @carry="handleCarry"
        />
      </ol>
    </template>

    <section v-else class="close-day__empty">
      <h2 class="close-day__summary">No intentions today.</h2>
      <p class="close-day__lede close-day__lede--muted">
        {{ formatDuration(totalMinutes) }} of real focus. Tomorrow, try choosing 3 before you start.
      </p>
    </section>

    <section class="close-day__tomorrow" aria-labelledby="close-day-tomorrow">
      <header class="close-day__tomorrow-header">
        <div>
          <h2 id="close-day-tomorrow" class="close-day__tomorrow-title">Tomorrow.</h2>
          <p class="close-day__tomorrow-sub">Carry over and choose up to {{ MAX }} intentions</p>
        </div>
        <span class="close-day__allocation">{{ tomorrow.length }}/{{ MAX }} set</span>
      </header>

      <ol class="close-day__grid">
        <TomorrowSlot
          v-for="slot in slots"
          :key="slot.position"
          :position="slot.position"
          :intention="slot.intention"
          :carried="slot.intention !== null && isCarriedOver(slot.intention, today)"
          :busy="busy"
          @remove="handleRemove"
        />
      </ol>

      <div v-if="tomorrow.length < MAX" class="close-day__add">
        <div v-if="inboxPicks.length > 0" class="close-day__picks">
          <span class="close-day__picks-label">From your inbox</span>
          <ul class="close-day__picks-list">
            <li v-for="capture in inboxPicks" :key="capture.id">
              <button
                class="close-day__pick"
                type="button"
                :disabled="busy"
                @click="handleAdd({ text: capture.text })"
              >
                <span class="material-symbols-outlined" aria-hidden="true">add</span>
                {{ capture.text }}
              </button>
            </li>
          </ul>
        </div>

        <IntentionForm
          :suggestions="suggestionsFor('day', tomorrowDate)"
          :busy="busy"
          placeholder="What should tomorrow be about?"
          @add="handleAdd"
        />
      </div>
    </section>

    <footer class="close-day__footer">
      <RouterLink class="close-day__close" :to="{ name: 'assistant' }">
        Close the day
        <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
      </RouterLink>
      <p class="close-day__motto">
        Progress, <span class="close-day__motto-accent">not busyness.</span>
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AssistantNav from '@/modules/assistant/components/AssistantNav.vue'
import DayReviewCard from '@/modules/assistant/components/DayReviewCard.vue'
import TomorrowSlot from '@/modules/assistant/components/TomorrowSlot.vue'
import IntentionForm from '@/modules/assistant/components/IntentionForm.vue'
import { useIntentions, type NewIntention } from '@/modules/assistant/composables/useIntentions'
import { useDayFocus } from '@/modules/assistant/composables/useDayFocus'
import { useCaptures } from '@/modules/assistant/composables/useCaptures'
import { addDays, progress } from '@/modules/assistant/composables/intentionHelpers'
import { formatDuration, isCarriedOver } from '@/modules/assistant/composables/closeDayHelpers'
import { MAX_INTENTIONS_PER_SCOPE } from '@/modules/assistant/services/intentions.service'
import type { Intention, IntentionPosition } from '@/modules/assistant/types'

const MAX = MAX_INTENTIONS_PER_SCOPE
const POSITIONS: readonly IntentionPosition[] = [1, 2, 3]
const INBOX_PICKS = 4

const {
  error: intentionsError,
  load: loadIntentions,
  loadTasks,
  listFor,
  suggestionsFor,
  add,
  carryOver,
  toggleDone,
  remove,
} = useIntentions()
const { error: focusError, load: loadFocus, totalMinutes, minutesFor } = useDayFocus()
const { inbox, error: capturesError, load: loadCaptures } = useCaptures()

const todayDate = new Date()
const tomorrowDate = addDays(todayDate, 1)
const dateLabel = todayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

const busy = ref(false)

const today = computed(() => listFor('day', todayDate))
const tomorrow = computed(() => listFor('day', tomorrowDate))
const stats = computed(() => progress(today.value))

const slots = computed(() =>
  POSITIONS.map((position) => ({
    position,
    intention: tomorrow.value.find((i) => i.position === position) ?? null,
  })),
)

const inboxPicks = computed(() => inbox.value.slice(0, INBOX_PICKS))

const errorMessage = computed(
  () => intentionsError.value?.message ?? focusError.value?.message ?? capturesError.value?.message ?? null,
)

onMounted(async () => {
  await Promise.all([loadIntentions(todayDate), loadTasks(), loadFocus(todayDate), loadCaptures()])
})

async function withBusy(action: () => Promise<boolean>): Promise<void> {
  busy.value = true
  await action()
  busy.value = false
}

function handleToggle(intention: Intention): Promise<void> {
  return withBusy(() => toggleDone(intention))
}

function handleCarry(intention: Intention): Promise<void> {
  return withBusy(() => carryOver(intention, todayDate))
}

function handleRemove(id: string): Promise<void> {
  return withBusy(() => remove(id))
}

function handleAdd(input: NewIntention): Promise<void> {
  return withBusy(() => add('day', tomorrowDate, input))
}
</script>

<style scoped>
.close-day {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  height: 100%;
  padding: var(--space-xl);
  overflow-y: auto;
}

/* Scrolling column: sections keep their natural height. */
.close-day > * {
  flex-shrink: 0;
}

/* Hero */
.close-day__hero {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-xl);
  border: var(--border-width) solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-lg);
  background-color: var(--color-pine);
  background-image: radial-gradient(
    100% 120% at 80% 0%,
    rgba(0, 230, 118, 0.18) 0%,
    rgba(10, 47, 29, 0) 60%
  );
  box-shadow: var(--shadow-pod);
  color: var(--color-on-pod);
  overflow: hidden;
  isolation: isolate;
}

:root[data-theme='dark'] .close-day__hero {
  background-color: var(--color-pod);
}

.close-day__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  color: var(--color-mint);
}

.close-day__wave {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
  opacity: 0.45;
  vector-effect: non-scaling-stroke;
}

.close-day__wave--dashed {
  stroke-dasharray: 6 6;
  opacity: 0.3;
}

.close-day__eyebrow {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-on-pod-muted);
}

.close-day__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background-color: var(--color-accent);
  box-shadow: var(--shadow-glow);
}

.close-day__title {
  margin-top: var(--space-lg);
  font-family: var(--font-display);
  font-size: clamp(40px, 7vw, var(--font-size-display));
  font-weight: var(--font-weight-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--color-on-pod);
}

.close-day__badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  background-color: var(--color-ink);
  vertical-align: middle;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  color: var(--color-accent);
}

.close-day__lede {
  max-width: 52ch;
  font-size: var(--font-size-body);
  line-height: var(--leading-normal);
  color: var(--color-on-pod-muted);
}

.close-day__lede--muted {
  color: var(--color-gray-500);
}

.close-day__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}

/* Summary + cards */
.close-day__summary {
  margin-top: var(--space-lg);
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 40px);
  font-weight: var(--font-weight-bold);
  line-height: 1.1;
  letter-spacing: var(--tracking-tight);
  text-transform: uppercase;
  color: var(--color-primary);
}

.close-day__summary-accent {
  color: var(--color-accent-strong);
}

.close-day__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-lg);
}

.close-day__empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* Tomorrow */
.close-day__tomorrow {
  margin-top: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.close-day__tomorrow-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.close-day__tomorrow-title {
  font-family: var(--font-display);
  font-size: clamp(48px, 8vw, var(--font-size-display));
  font-weight: var(--font-weight-medium);
  line-height: 1;
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: transparent;
  -webkit-text-stroke: 1.5px var(--color-primary);
}

.close-day__tomorrow-sub {
  margin-top: var(--space-sm);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-600);
}

.close-day__allocation {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  background-color: var(--color-gray-200);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-600);
}

.close-day__add {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.close-day__picks {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.close-day__picks-label {
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.close-day__picks-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.close-day__pick {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  max-width: 320px;
  padding: var(--space-xs) var(--space-md) var(--space-xs) var(--space-sm);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background-color: var(--color-background);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-day__pick:hover:not(:disabled) {
  border-color: var(--color-mint);
}

.close-day__pick .material-symbols-outlined {
  font-size: 16px;
  color: var(--color-accent-strong);
}

/* Footer */
.close-day__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
  margin-top: var(--space-xl);
  padding-bottom: var(--space-lg);
}

.close-day__close {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  height: 52px;
  padding: 0 var(--space-lg);
  border-radius: var(--radius-full);
  background-color: var(--color-pine);
  box-shadow: var(--shadow-lg);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-accent);
  text-decoration: none;
  transition: box-shadow 0.2s;
}

:root[data-theme='dark'] .close-day__close {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}

.close-day__close:hover {
  box-shadow: var(--shadow-glow);
}

.close-day__close .material-symbols-outlined {
  font-size: var(--icon-size-sm);
}

.close-day__motto {
  font-family: var(--font-display);
  font-size: clamp(24px, 3vw, 36px);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  text-transform: uppercase;
  color: var(--color-primary);
}

.close-day__motto-accent {
  color: var(--color-accent-strong);
}

@media (max-width: 767px) {
  .close-day {
    padding: var(--space-lg) var(--space-md);
  }

  .close-day__hero {
    padding: var(--space-lg);
  }
}
</style>
