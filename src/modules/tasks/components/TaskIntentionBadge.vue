<template>
  <span
    v-if="intention"
    class="task-intention-badge"
    :class="{ 'task-intention-badge--on-pod': onPod }"
    :title="`Serves ${scopeLabel.toLowerCase()} intention: ${intention.text}`"
  >
    <span class="material-symbols-outlined task-intention-badge__icon" aria-hidden="true">flag</span>
    <span class="task-intention-badge__scope">{{ scopeLabel }}</span>
    <span class="task-intention-badge__text">{{ intention.text }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTaskIntention } from '@/modules/tasks/composables/useTaskIntention'

const props = defineProps<{
  intentionId: string | null
  /** Rendered on a dark pod surface (featured cards). */
  onPod?: boolean
}>()

const { ensureLoaded, findIntention } = useTaskIntention()

onMounted(() => {
  if (props.intentionId) void ensureLoaded()
})

const intention = computed(() => findIntention(props.intentionId))

const scopeLabel = computed(() => (intention.value?.scope === 'week' ? 'Week' : 'Today'))
</script>

<style scoped>
.task-intention-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  max-width: 100%;
  min-width: 0;
  padding: 2px var(--space-sm);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xxs);
  color: var(--color-primary);
}

.task-intention-badge__icon {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-accent-strong);
}

.task-intention-badge__scope {
  flex-shrink: 0;
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.task-intention-badge__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-intention-badge--on-pod {
  border-color: color-mix(in srgb, var(--color-on-pod) 20%, transparent);
  color: var(--color-on-pod);
}

.task-intention-badge--on-pod .task-intention-badge__icon {
  color: var(--color-accent);
}
</style>
