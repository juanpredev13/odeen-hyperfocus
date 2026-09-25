<template>
  <span
    class="quadrant-badge"
    :class="[`quadrant-badge--${quadrant}`, { 'quadrant-badge--inverted': inverted }]"
    :title="info.description"
  >
    <span class="quadrant-badge__dot" aria-hidden="true" />
    {{ info.label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getQuadrantInfo, getTaskQuadrant } from '@/modules/tasks/composables/useTaskQuadrant'
import type { Task } from '@/modules/tasks/types'

const props = defineProps<{
  task: Pick<Task, 'impact_score' | 'is_attractive'>
  /** For dark (primary-colored) card backgrounds. */
  inverted?: boolean
}>()

const quadrant = computed(() => getTaskQuadrant(props.task))
const info = computed(() => getQuadrantInfo(quadrant.value))
</script>

<style scoped>
.quadrant-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 2px var(--space-sm);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}

.quadrant-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.quadrant-badge--purposeful {
  color: var(--color-quadrant-purposeful-text);
}

.quadrant-badge--purposeful .quadrant-badge__dot {
  background-color: var(--color-quadrant-purposeful-dot);
}

.quadrant-badge--necessary {
  color: var(--color-quadrant-necessary-text);
}

.quadrant-badge--necessary .quadrant-badge__dot {
  background-color: var(--color-quadrant-necessary-dot);
}

.quadrant-badge--distracting {
  color: var(--color-quadrant-distracting-text);
}

.quadrant-badge--distracting .quadrant-badge__dot {
  background-color: var(--color-quadrant-distracting-dot);
}

.quadrant-badge--unnecessary {
  color: var(--color-quadrant-unnecessary-text);
}

.quadrant-badge--unnecessary .quadrant-badge__dot {
  background-color: var(--color-quadrant-unnecessary-dot);
}

/* On primary-colored surfaces keep the dot color, neutralize text + border. */
.quadrant-badge--inverted {
  color: color-mix(in srgb, var(--color-surface) 80%, transparent);
  border-color: color-mix(in srgb, var(--color-surface) 20%, transparent);
}
</style>
