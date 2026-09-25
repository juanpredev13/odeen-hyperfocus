<template>
  <li class="intention-item" :class="{ 'intention-item--done': intention.done }">
    <label class="intention-item__check">
      <input
        class="intention-item__checkbox"
        type="checkbox"
        :checked="intention.done"
        :aria-label="`Mark “${intention.text}” as ${intention.done ? 'not done' : 'done'}`"
        @change="emit('toggle', intention)"
      />
      <span class="intention-item__box" aria-hidden="true">
        <span class="material-symbols-outlined intention-item__tick">check</span>
      </span>
    </label>

    <div class="intention-item__body">
      <p class="intention-item__text">
        <span class="intention-item__position">{{ intention.position }}</span>
        {{ intention.text }}
        <span
          v-if="intention.task_id"
          class="material-symbols-outlined intention-item__linked"
          title="Linked to a task"
          aria-label="Linked to a task"
        >link</span>
      </p>

      <dl v-if="hasDetails" class="intention-item__details">
        <template v-if="intention.when_text">
          <dt class="intention-item__term">When</dt>
          <dd class="intention-item__value">{{ intention.when_text }}</dd>
        </template>
        <template v-if="intention.where_text">
          <dt class="intention-item__term">Where</dt>
          <dd class="intention-item__value">{{ intention.where_text }}</dd>
        </template>
        <template v-if="intention.first_action">
          <dt class="intention-item__term">First action</dt>
          <dd class="intention-item__value">{{ intention.first_action }}</dd>
        </template>
      </dl>
    </div>

    <button
      class="intention-item__remove"
      type="button"
      :aria-label="`Remove “${intention.text}”`"
      title="Remove"
      @click="emit('remove', intention.id)"
    >
      <span class="material-symbols-outlined" aria-hidden="true">close</span>
    </button>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Intention } from '@/modules/assistant/types'

const props = defineProps<{ intention: Intention }>()

const emit = defineEmits<{
  toggle: [intention: Intention]
  remove: [id: string]
}>()

const hasDetails = computed(
  () =>
    props.intention.when_text !== null ||
    props.intention.where_text !== null ||
    props.intention.first_action !== null,
)
</script>

<style scoped>
.intention-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.intention-item__check {
  position: relative;
  display: flex;
  cursor: pointer;
  padding-top: 2px;
}

.intention-item__checkbox {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.intention-item__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: var(--border-width) solid var(--color-gray-400);
  border-radius: var(--radius-full);
  transition:
    background-color 0.15s,
    border-color 0.15s;
}

.intention-item__tick {
  font-size: 14px;
  color: var(--color-surface);
  opacity: 0;
}

.intention-item__checkbox:checked + .intention-item__box {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.intention-item__checkbox:checked + .intention-item__box .intention-item__tick {
  opacity: 1;
}

.intention-item__checkbox:focus-visible + .intention-item__box {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.intention-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.intention-item__text {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  line-height: var(--leading-snug);
  overflow-wrap: anywhere;
}

.intention-item--done .intention-item__text {
  color: var(--color-gray-400);
  text-decoration: line-through;
}

.intention-item__position {
  flex-shrink: 0;
  font-family: monospace;
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}

.intention-item__linked {
  font-size: 16px;
  color: var(--color-gray-400);
}

.intention-item__details {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: var(--space-sm);
  row-gap: 2px;
  margin: 0;
}

.intention-item__term {
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-gray-400);
  padding-top: 2px;
}

.intention-item__value {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.intention-item__remove {
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
  transition:
    color 0.15s,
    background-color 0.15s;
}

.intention-item__remove:hover {
  color: var(--color-danger-text);
  background-color: var(--color-danger-bg);
}

.intention-item__remove .material-symbols-outlined {
  font-size: 16px;
}
</style>
