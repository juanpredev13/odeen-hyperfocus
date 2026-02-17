<template>
  <div class="task-card" :class="`task-card--${task.status}`">
    <div class="task-card__header">
      <span class="task-card__status">{{ statusLabel }}</span>
      <div class="task-card__actions">
        <button class="task-card__btn" title="Edit" @click="$emit('edit', task)">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="task-card__btn task-card__btn--danger" title="Delete" @click="$emit('delete', task.id)">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>

    <h3 class="task-card__title">{{ task.title }}</h3>
    <p v-if="task.description" class="task-card__description">{{ task.description }}</p>

    <div class="task-card__meta">
      <div class="task-card__meta-item" :title="`Energy: ${task.energy_level}/3`">
        <span class="material-symbols-outlined task-card__meta-icon">bolt</span>
        <span class="task-card__meta-dots">
          <span
            v-for="i in 3"
            :key="i"
            class="task-card__dot"
            :class="{ 'task-card__dot--active': i <= task.energy_level }"
          ></span>
        </span>
      </div>
      <div class="task-card__meta-item" :title="`Impact: ${task.impact_score}/5`">
        <span class="material-symbols-outlined task-card__meta-icon">trending_up</span>
        <span class="task-card__meta-dots">
          <span
            v-for="i in 5"
            :key="i"
            class="task-card__dot"
            :class="{ 'task-card__dot--active': i <= task.impact_score }"
          ></span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/modules/tasks/types'

const props = defineProps<{ task: Task }>()

defineEmits<{
  edit: [task: Task]
  delete: [id: string]
}>()

const statusLabel = computed(() => {
  const labels: Record<string, string> = { todo: 'To Do', doing: 'Doing', done: 'Done' }
  return labels[props.task.status]
})
</script>

<style scoped>
.task-card {
  background-color: var(--color-surface);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  transition: box-shadow 0.15s;
}

.task-card:hover {
  box-shadow: var(--shadow-sm);
}

.task-card--doing {
  border-left: 3px solid var(--color-status-active-dot);
}

.task-card--done {
  opacity: 0.6;
}

.task-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-card__status {
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-gray-400);
}

.task-card__actions {
  display: flex;
  gap: var(--space-xs);
  opacity: 0;
  transition: opacity 0.15s;
}

.task-card:hover .task-card__actions {
  opacity: 1;
}

.task-card__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  border-radius: var(--radius-md);
  color: var(--color-gray-400);
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
}

.task-card__btn:hover {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.task-card__btn--danger:hover {
  color: #dc2626;
  background-color: #fef2f2;
}

.task-card__btn .material-symbols-outlined {
  font-size: 16px;
}

.task-card__title {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  line-height: var(--leading-snug);
}

.task-card__description {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  line-height: var(--leading-relaxed);
}

.task-card__meta {
  display: flex;
  gap: var(--space-md);
  padding-top: var(--space-xs);
  border-top: var(--border-width) solid var(--border-color);
}

.task-card__meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.task-card__meta-icon {
  font-size: 14px;
  color: var(--color-gray-400);
}

.task-card__meta-dots {
  display: flex;
  gap: 3px;
}

.task-card__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-gray-200);
}

.task-card__dot--active {
  background-color: var(--color-primary);
}
</style>
