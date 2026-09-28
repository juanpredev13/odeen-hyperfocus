<template>
  <section class="schedule-onboarding" aria-labelledby="schedule-onboarding-title">
    <ol class="schedule-onboarding__cards" aria-label="How it works">
      <li v-for="card in CARDS" :key="card.title" class="schedule-onboarding__card">
        <span class="schedule-onboarding__card-icon material-symbols-outlined" aria-hidden="true">{{ card.icon }}</span>
        <div>
          <p class="schedule-onboarding__card-title">{{ card.title }}</p>
          <p class="schedule-onboarding__card-text">{{ card.text }}</p>
        </div>
      </li>
    </ol>

    <p class="schedule-onboarding__eyebrow">
      <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
      Time by design
    </p>
    <h1 id="schedule-onboarding-title" class="schedule-onboarding__title">Decide your time before it's spent.</h1>
    <p class="schedule-onboarding__lede">
      Divide your week into segments — work, learning, side projects, leisure, rest — in 15-minute
      mini-slots. Leisure and rest are planned time too.
    </p>

    <div class="schedule-onboarding__actions">
      <button class="schedule-onboarding__cta" type="button" :disabled="busy" @click="emit('build')">
        Build my week
        <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
      </button>
      <button class="schedule-onboarding__skip" type="button" :disabled="busy" @click="emit('starter')">
        Start from a starter week
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ busy: boolean }>()

const emit = defineEmits<{
  build: []
  starter: []
}>()

const CARDS = [
  { icon: 'donut_large', title: 'Choose your segments.', text: 'Work, learning, side projects, leisure, rest.' },
  { icon: 'calendar_view_week', title: 'Block your week.', text: 'A repeating rhythm on a 15-minute grid.' },
  { icon: 'shield', title: 'Protect your focus.', text: 'Focus sessions know which segment they belong to.' },
] as const
</script>

<style scoped>
.schedule-onboarding {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 560px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
  border-radius: var(--radius-lg);
  background-color: var(--color-pod);
  background-image: radial-gradient(90% 60% at 50% 20%, rgba(0, 230, 118, 0.16), rgba(10, 47, 29, 0) 70%);
  box-shadow: var(--shadow-pod);
  color: var(--color-on-pod);
}

.schedule-onboarding__cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.schedule-onboarding__card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  border: var(--border-width) solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  background-color: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.12);
}

.schedule-onboarding__card:nth-child(1) {
  transform: rotate(-2deg);
}

.schedule-onboarding__card:nth-child(2) {
  transform: rotate(1.5deg) translateX(12px);
}

.schedule-onboarding__card:nth-child(3) {
  transform: rotate(-1deg);
}

.schedule-onboarding__card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background-color: rgba(0, 230, 118, 0.12);
  color: var(--color-accent);
}

.schedule-onboarding__card-title {
  font-family: var(--font-display);
  font-weight: var(--font-weight-semibold);
}

.schedule-onboarding__card-text {
  font-size: var(--font-size-sm);
  color: var(--color-on-pod-muted);
}

.schedule-onboarding__eyebrow {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--space-xs);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-sm);
  background-color: rgba(0, 230, 118, 0.12);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-accent);
}

.schedule-onboarding__eyebrow .material-symbols-outlined {
  font-size: 14px;
}

.schedule-onboarding__title {
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 44px);
  font-weight: var(--font-weight-bold);
  line-height: 1.1;
  letter-spacing: var(--tracking-tight);
  color: var(--color-on-pod);
}

.schedule-onboarding__lede {
  color: var(--color-on-pod-muted);
}

.schedule-onboarding__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-sm);
}

.schedule-onboarding__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  height: 56px;
  border: none;
  border-radius: var(--radius-full);
  background-color: var(--color-accent);
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-on-accent);
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.schedule-onboarding__cta:hover:not(:disabled) {
  box-shadow: var(--shadow-glow);
}

.schedule-onboarding__skip {
  padding: var(--space-sm);
  border: none;
  background: none;
  font-size: var(--font-size-sm);
  color: var(--color-on-pod-muted);
  cursor: pointer;
}

.schedule-onboarding__skip:hover:not(:disabled) {
  color: var(--color-on-pod);
}

.schedule-onboarding__cta:disabled,
.schedule-onboarding__skip:disabled {
  opacity: 0.6;
  cursor: wait;
}
</style>
