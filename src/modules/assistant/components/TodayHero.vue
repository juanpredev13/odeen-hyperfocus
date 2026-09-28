<template>
  <section class="today-hero" aria-labelledby="today-hero-title">
    <svg class="today-hero__art" viewBox="0 0 600 420" preserveAspectRatio="none" aria-hidden="true">
      <path class="today-hero__wave" d="M0 90 C 140 110, 220 190, 330 190 S 520 70, 600 60" />
      <path class="today-hero__wave" d="M0 330 C 120 330, 220 400, 360 400 S 520 330, 600 300" />
    </svg>
    <svg class="today-hero__art today-hero__art--mark" viewBox="0 0 300 300" aria-hidden="true">
      <circle class="today-hero__line" cx="150" cy="150" r="80" />
      <line class="today-hero__line" x1="150" y1="20" x2="150" y2="280" />
      <line class="today-hero__line" x1="20" y1="150" x2="280" y2="150" />
    </svg>

    <header class="today-hero__meta">
      <span class="today-hero__pill">
        <span class="today-hero__dot" aria-hidden="true"></span>
        {{ current ? `Intention ${current.position} · Now` : 'No intention set' }}
      </span>
      <span class="today-hero__block">
        <span class="material-symbols-outlined" aria-hidden="true">schedule</span>
        {{ sessionMinutes }}m block
      </span>
    </header>

    <h2 id="today-hero-title" class="today-hero__title">
      {{ title }}
    </h2>

    <footer class="today-hero__footer">
      <RouterLink
        v-if="current?.task_id"
        class="today-hero__cta"
        :to="{ name: 'focus', params: { taskId: current.task_id } }"
      >
        Start focus
        <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
      </RouterLink>
      <a v-else-if="current" class="today-hero__cta today-hero__cta--ghost" href="#planner-title">
        Link a task to focus
        <span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span>
      </a>
      <a v-else class="today-hero__cta" href="#planner-title">
        Choose your 3
        <span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span>
      </a>

      <p v-if="intentions.length > 0" class="today-hero__count">
        <span class="today-hero__count-label">{{ allDone ? 'All done' : 'Deep session' }}</span>
        <span class="today-hero__count-value">
          {{ pad(doneCount + (allDone ? 0 : 1)) }} / {{ pad(intentions.length) }}
        </span>
      </p>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Intention } from '@/modules/assistant/types'

const props = defineProps<{
  intentions: Intention[]
  sessionMinutes: number
}>()

const current = computed<Intention | null>(() => props.intentions.find((i) => !i.done) ?? null)
const doneCount = computed(() => props.intentions.filter((i) => i.done).length)
const allDone = computed(() => props.intentions.length > 0 && current.value === null)

const title = computed(() => {
  if (current.value) return current.value.text
  if (allDone.value) return 'Done for today.'
  return 'Decide what matters.'
})

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
</script>

<style scoped>
.today-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-xl);
  min-height: 380px;
  padding: var(--space-lg);
  border: var(--border-width) solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-lg);
  background-color: var(--color-pod);
  background-image: radial-gradient(
    120% 90% at 20% 0%,
    rgba(0, 230, 118, 0.12) 0%,
    rgba(10, 47, 29, 0) 60%
  );
  box-shadow: var(--shadow-pod);
  color: var(--color-on-pod);
  overflow: hidden;
  isolation: isolate;
}

.today-hero__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  color: var(--color-mint);
}

.today-hero__art--mark {
  inset: 10% 5% 10% auto;
  width: 60%;
}

.today-hero__wave {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
  stroke-dasharray: 6 6;
  opacity: 0.35;
  vector-effect: non-scaling-stroke;
}

.today-hero__line {
  fill: none;
  stroke: currentColor;
  stroke-width: 1;
  opacity: 0.2;
  vector-effect: non-scaling-stroke;
}

.today-hero__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.today-hero__pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  height: 32px;
  padding: 0 var(--space-md);
  border: var(--border-width) solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-full);
  background-color: rgba(0, 0, 0, 0.35);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.today-hero__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-accent);
  box-shadow: var(--shadow-glow);
}

.today-hero__block {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-on-pod-muted);
}

.today-hero__block .material-symbols-outlined {
  font-size: var(--icon-size-sm);
  color: var(--color-accent);
}

.today-hero__title {
  max-width: 14ch;
  font-family: var(--font-display);
  font-size: clamp(36px, 6vw, 64px);
  font-weight: var(--font-weight-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  overflow-wrap: anywhere;
  color: var(--color-on-pod);
}

.today-hero__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.today-hero__cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  height: 52px;
  padding: 0 var(--space-lg);
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-pine);
  text-decoration: none;
  transition: box-shadow 0.2s;
}

:root[data-theme='dark'] .today-hero__cta {
  background-color: var(--color-accent);
}

.today-hero__cta:hover {
  box-shadow: var(--shadow-glow);
}

.today-hero__cta--ghost {
  border: var(--border-width) solid rgba(255, 255, 255, 0.2);
  background-color: transparent;
  color: var(--color-on-pod);
}

:root[data-theme='dark'] .today-hero__cta--ghost {
  background-color: transparent;
}

.today-hero__cta .material-symbols-outlined {
  font-size: var(--icon-size-sm);
}

.today-hero__count {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.today-hero__count-label {
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-on-pod-muted);
}

.today-hero__count-value {
  font-family: var(--font-display);
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
}
</style>
