<template>
  <li v-if="intention" class="tomorrow-slot">
    <header class="tomorrow-slot__header">
      <span class="tomorrow-slot__label">Slot {{ String(position).padStart(2, '0') }}</span>
      <span v-if="carried" class="tomorrow-slot__tag">Carried from today</span>
    </header>

    <p class="tomorrow-slot__text">{{ intention.text }}</p>

    <footer class="tomorrow-slot__footer">
      <span class="tomorrow-slot__meta">
        <template v-if="intention.task_id">
          <span class="material-symbols-outlined" aria-hidden="true">link</span>
          Linked task
        </template>
      </span>
      <button
        class="tomorrow-slot__remove"
        type="button"
        :disabled="busy"
        :aria-label="`Remove “${intention.text}” from tomorrow`"
        @click="emit('remove', intention.id)"
      >
        Remove
      </button>
    </footer>
  </li>

  <li v-else class="tomorrow-slot tomorrow-slot--empty">
    <span class="tomorrow-slot__plus" aria-hidden="true">
      <span class="material-symbols-outlined">add</span>
    </span>
    <span class="tomorrow-slot__label">Open slot {{ String(position).padStart(2, '0') }}</span>
  </li>
</template>

<script setup lang="ts">
import type { Intention, IntentionPosition } from '@/modules/assistant/types'

defineProps<{
  position: IntentionPosition
  intention: Intention | null
  carried: boolean
  busy: boolean
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()
</script>

<style scoped>
.tomorrow-slot {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-height: 200px;
  padding: var(--space-lg);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.tomorrow-slot--empty {
  align-items: center;
  justify-content: center;
  border-style: dashed;
  border-color: var(--color-gray-300);
  background-color: var(--color-gray-100);
  box-shadow: none;
}

.tomorrow-slot__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.tomorrow-slot__label {
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.tomorrow-slot__tag {
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  background-color: var(--color-status-done);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-status-done-text);
}

.tomorrow-slot__text {
  flex: 1;
  font-family: var(--font-display);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  overflow-wrap: anywhere;
  color: var(--color-primary);
}

.tomorrow-slot__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.tomorrow-slot__meta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.tomorrow-slot__meta .material-symbols-outlined {
  font-size: 14px;
}

.tomorrow-slot__remove {
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-primary);
  cursor: pointer;
}

.tomorrow-slot__remove:hover:not(:disabled) {
  color: var(--color-danger-text);
}

.tomorrow-slot__plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background-color: var(--color-gray-200);
  color: var(--color-gray-600);
}

@media (max-width: 767px) {
  .tomorrow-slot {
    min-height: 0;
  }
}
</style>
