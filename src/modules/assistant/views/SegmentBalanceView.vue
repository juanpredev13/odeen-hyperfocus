<template>
  <div class="balance">
    <AssistantNav />

    <p v-if="error" class="balance__error" role="alert">{{ error.message }}</p>

    <section class="balance__hero" aria-labelledby="balance-title">
      <p class="balance__eyebrow">Weekly reflection · {{ weekLabel }}</p>
      <h1 id="balance-title" class="balance__title">Segment balance.</h1>
      <p class="balance__lede">Where this week's time was planned, and where focus actually went.</p>

      <dl class="balance__tiles">
        <div class="balance__tile">
          <dt class="balance__tile-label">Planned</dt>
          <dd class="balance__tile-value">{{ hours(totalPlanned) }}</dd>
          <dd class="balance__tile-note">On the schedule</dd>
        </div>
        <div class="balance__tile">
          <dt class="balance__tile-label">Focused</dt>
          <dd class="balance__tile-value">{{ hours(totalFocused) }}</dd>
          <dd class="balance__tile-note">Hyperfocus sessions</dd>
        </div>
        <div class="balance__tile">
          <dt class="balance__tile-label">Unplanned</dt>
          <dd class="balance__tile-value">{{ hours(Math.max(0, WEEK_MINUTES - totalPlanned)) }}</dd>
          <dd class="balance__tile-note">Open time</dd>
        </div>
      </dl>
    </section>

    <section class="balance__rhythm" aria-labelledby="balance-rhythm">
      <header class="balance__rhythm-header">
        <h2 id="balance-rhythm" class="balance__rhythm-title">Segment rhythm</h2>
        <RouterLink class="balance__adjust" :to="{ name: 'assistant-schedule' }">
          Adjust schedule
          <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </RouterLink>
      </header>

      <p v-if="loaded && rows.length === 0" class="balance__empty">
        No segments yet.
        <RouterLink :to="{ name: 'assistant-schedule' }">Build your week</RouterLink>
        to see the balance.
      </p>

      <ul class="balance__list">
        <li v-for="row in rows" :key="row.segment.id" class="balance__row" :class="`balance__row--${row.segment.color_key}`">
          <span class="balance__icon material-symbols-outlined" aria-hidden="true">{{ row.segment.icon }}</span>
          <div class="balance__info">
            <p class="balance__name">{{ row.segment.name }}</p>
            <p class="balance__detail">
              <template v-if="row.focusedMinutes > 0">
                {{ hours(row.focusedMinutes) }} focused of {{ hours(row.plannedMinutes) }} planned
              </template>
              <template v-else>{{ hours(row.plannedMinutes) }} planned</template>
            </p>
          </div>
          <span class="balance__hours">{{ hours(row.plannedMinutes) }}</span>
          <meter
            class="balance__meter"
            :value="row.focusedMinutes > 0 ? row.focusedMinutes : row.plannedMinutes"
            min="0"
            :max="Math.max(row.plannedMinutes, row.focusedMinutes, 1)"
            :aria-label="`${row.segment.name} progress`"
          ></meter>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AssistantNav from '@/modules/assistant/components/AssistantNav.vue'
import { useSegmentBalance } from '@/modules/assistant/composables/useSegmentBalance'

const WEEK_MINUTES = 7 * 24 * 60

const { days, rows, totalPlanned, totalFocused, loaded, error, load } = useSegmentBalance()

const weekLabel = `${days[0]?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6]?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`

function hours(minutes: number): string {
  const h = minutes / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`
}

onMounted(load)
</script>

<style scoped>
.balance {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 880px;
  height: 100%;
  padding: var(--space-xl);
  overflow-y: auto;
}

.balance > * {
  flex-shrink: 0;
}

.balance__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}

.balance__hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  background-color: var(--color-pine);
  background-image: radial-gradient(90% 80% at 80% 0%, rgba(0, 230, 118, 0.18), rgba(10, 47, 29, 0) 60%);
  box-shadow: var(--shadow-pod);
  color: var(--color-on-pod);
}

:root[data-theme='dark'] .balance__hero {
  background-color: var(--color-pod);
}

.balance__eyebrow,
.balance__tile-label {
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-accent);
}

.balance__title {
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 44px);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-on-pod);
}

.balance__lede {
  color: var(--color-on-pod-muted);
}

.balance__tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.balance__tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-md);
  border: var(--border-width) solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  background-color: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
}

.balance__tile-label {
  color: var(--color-on-pod-muted);
}

.balance__tile-value {
  font-family: var(--font-display);
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent);
}

.balance__tile-note {
  font-size: var(--font-size-xxs);
  color: var(--color-on-pod-muted);
}

.balance__rhythm {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.balance__rhythm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.balance__rhythm-title {
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-primary);
}

.balance__adjust {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-accent-strong);
  text-decoration: none;
}

.balance__adjust .material-symbols-outlined {
  font-size: 16px;
}

.balance__empty {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.balance__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.balance__row {
  --seg: var(--color-segment-slate);
  --seg-bg: var(--color-segment-slate-bg);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
  padding: var(--space-md) var(--space-lg);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.balance__row--emerald { --seg: var(--color-segment-emerald); --seg-bg: var(--color-segment-emerald-bg); }
.balance__row--mint { --seg: var(--color-segment-mint); --seg-bg: var(--color-segment-mint-bg); }
.balance__row--sage { --seg: var(--color-segment-sage); --seg-bg: var(--color-segment-sage-bg); }
.balance__row--amber { --seg: var(--color-segment-amber); --seg-bg: var(--color-segment-amber-bg); }
.balance__row--slate { --seg: var(--color-segment-slate); --seg-bg: var(--color-segment-slate-bg); }
.balance__row--sky { --seg: var(--color-segment-sky); --seg-bg: var(--color-segment-sky-bg); }
.balance__row--rose { --seg: var(--color-segment-rose); --seg-bg: var(--color-segment-rose-bg); }

.balance__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background-color: var(--seg-bg);
  color: var(--seg);
}

.balance__name {
  font-family: var(--font-display);
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.balance__detail {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.balance__hours {
  font-family: var(--font-display);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.balance__meter {
  grid-column: 1 / -1;
  width: 100%;
  height: 6px;
  appearance: none;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-gray-200);
}

.balance__meter::-webkit-meter-bar {
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-gray-200);
}

.balance__meter::-webkit-meter-optimum-value,
.balance__meter::-webkit-meter-suboptimum-value,
.balance__meter::-webkit-meter-even-less-good-value {
  border-radius: var(--radius-full);
  background: var(--seg);
}

.balance__meter::-moz-meter-bar {
  border-radius: var(--radius-full);
  background: var(--seg);
}

@media (max-width: 767px) {
  .balance {
    padding: var(--space-lg) var(--space-md);
  }

  .balance__tiles {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .balance__tile {
    padding: var(--space-sm);
  }
}
</style>
