<template>
  <ol v-if="rows.length > 0" class="sequence" aria-label="Rest of today's intentions">
    <li
      v-for="row in rows"
      :key="row.intention.id"
      class="sequence__row"
      :class="{ 'sequence__row--done': row.intention.done }"
    >
      <span class="sequence__number" aria-hidden="true">{{ row.intention.position }}</span>

      <div class="sequence__body">
        <span class="sequence__label">{{ row.label }}</span>
        <p class="sequence__text">{{ row.intention.text }}</p>
      </div>

      <button
        v-if="row.intention.done"
        class="sequence__badge"
        type="button"
        :aria-label="`Mark “${row.intention.text}” as not done`"
        @click="emit('toggle', row.intention)"
      >
        Done.
      </button>
      <RouterLink
        v-else-if="row.intention.task_id"
        class="sequence__go"
        :to="{ name: 'focus', params: { taskId: row.intention.task_id } }"
        :aria-label="`Focus on “${row.intention.text}”`"
      >
        <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
      </RouterLink>
      <button
        v-else
        class="sequence__go"
        type="button"
        :aria-label="`Mark “${row.intention.text}” as done`"
        @click="emit('toggle', row.intention)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">check</span>
      </button>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Intention } from '@/modules/assistant/types'

const props = defineProps<{
  intentions: Intention[]
  /** The intention shown in the hero — left out of the list. */
  currentId: string | null
}>()

const emit = defineEmits<{
  toggle: [intention: Intention]
}>()

interface SequenceRow {
  intention: Intention
  label: string
}

const rows = computed<SequenceRow[]>(() => {
  let upcoming = 0
  return props.intentions
    .filter((i) => i.id !== props.currentId)
    .map((intention) => {
      if (intention.done) return { intention, label: 'Completed' }
      upcoming += 1
      return { intention, label: upcoming === 1 ? 'Next in sequence' : 'Later today' }
    })
})
</script>

<style scoped>
.sequence {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.sequence__row {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.sequence__number {
  flex-shrink: 0;
  width: 1ch;
  font-family: var(--font-display);
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  color: var(--color-primary);
}

.sequence__row--done .sequence__number {
  color: var(--color-gray-300);
}

.sequence__body {
  flex: 1;
  min-width: 0;
}

.sequence__label {
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.sequence__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-display);
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.sequence__row--done .sequence__text {
  color: var(--color-gray-400);
  text-decoration: line-through;
}

.sequence__go {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: var(--radius-full);
  background-color: var(--color-gray-100);
  color: var(--color-primary);
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s;
}

.sequence__go:hover {
  background-color: var(--color-status-done);
}

.sequence__badge {
  flex-shrink: 0;
  padding: var(--space-xs) var(--space-md);
  border: none;
  border-radius: var(--radius-sm);
  background-color: var(--color-status-done);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-status-done-text);
  cursor: pointer;
}
</style>
