<template>
  <section class="schedule-now" aria-labelledby="schedule-now-title">
    <header class="schedule-now__header">
      <span class="material-symbols-outlined schedule-now__icon" aria-hidden="true">
        {{ currentSegment?.icon ?? 'calendar_view_week' }}
      </span>
      <h2 id="schedule-now-title" class="schedule-now__title">
        {{ currentSegment ? currentSegment.name : 'Schedule' }}
      </h2>
      <span v-if="current" class="schedule-now__live">
        <span class="schedule-now__dot" aria-hidden="true"></span>
        Now
      </span>
    </header>

    <p class="schedule-now__text">
      <template v-if="current">
        {{ formatRange(current) }}<template v-if="current.title"> · {{ current.title }}</template>
      </template>
      <template v-else-if="!hasSegments">Divide your week into work, learning, side projects, leisure and rest.</template>
      <template v-else>Unplanned time right now.</template>
    </p>

    <p v-if="next" class="schedule-now__next">
      Next: {{ segmentById(next.segment_id)?.name }} at {{ formatMinutes(next.start_minute) }}
    </p>

    <RouterLink class="schedule-now__link" :to="{ name: 'assistant-schedule' }">
      {{ hasSegments ? 'Open schedule' : 'Build my week' }}
      <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useSchedule } from '@/modules/assistant/composables/useSchedule'
import {
  currentBlock,
  formatMinutes,
  formatRange,
  minuteOfDay,
  nextBlock,
} from '@/modules/assistant/composables/scheduleHelpers'

const { activeSegments, load, blocksOn, segmentById } = useSchedule()

const now = ref(new Date())
let clock: ReturnType<typeof setInterval> | undefined

const today = computed(() => blocksOn(now.value))
const current = computed(() => currentBlock(today.value, minuteOfDay(now.value)))
const next = computed(() => nextBlock(today.value, minuteOfDay(now.value)))
const currentSegment = computed(() => (current.value ? segmentById(current.value.segment_id) : undefined))
const hasSegments = computed(() => activeSegments.value.length > 0)

onMounted(async () => {
  clock = setInterval(() => {
    now.value = new Date()
  }, 60_000)
  await load(now.value)
})

onUnmounted(() => {
  if (clock) clearInterval(clock)
})
</script>

<style scoped>
.schedule-now {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.schedule-now__header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.schedule-now__icon {
  font-size: var(--icon-size-lg);
  color: var(--color-accent-strong);
}

.schedule-now__title {
  flex: 1;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.schedule-now__live {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  background-color: var(--color-status-done);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-status-done-text);
}

.schedule-now__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-accent);
}

.schedule-now__text {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.schedule-now__next {
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.schedule-now__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  align-self: flex-start;
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-primary);
  text-decoration: none;
}

.schedule-now__link:hover {
  text-decoration: underline;
}

.schedule-now__link .material-symbols-outlined {
  font-size: 16px;
}
</style>
