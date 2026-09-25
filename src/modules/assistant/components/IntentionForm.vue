<template>
  <form class="intention-form" @submit.prevent="submitText">
    <div class="intention-form__row">
      <input
        v-model="text"
        class="intention-form__input"
        type="text"
        :placeholder="placeholder"
        aria-label="New intention"
        maxlength="200"
      />
      <button class="intention-form__submit" type="submit" :disabled="busy || !text.trim()">
        Add
      </button>
    </div>

    <button
      class="intention-form__toggle"
      type="button"
      :aria-expanded="showDetails"
      @click="showDetails = !showDetails"
    >
      <span class="material-symbols-outlined" aria-hidden="true">
        {{ showDetails ? 'expand_less' : 'expand_more' }}
      </span>
      Make it specific (when, where, first action)
    </button>

    <div v-if="showDetails" class="intention-form__details">
      <label class="intention-form__field">
        <span class="intention-form__label">When</span>
        <input v-model="whenText" class="intention-form__input" type="text" placeholder="e.g. 9:00, right after standup" />
      </label>
      <label class="intention-form__field">
        <span class="intention-form__label">Where</span>
        <input v-model="whereText" class="intention-form__input" type="text" placeholder="e.g. library, home office" />
      </label>
      <label class="intention-form__field">
        <span class="intention-form__label">First action</span>
        <input v-model="firstAction" class="intention-form__input" type="text" placeholder="e.g. open the draft and outline section 1" />
      </label>
    </div>

    <div v-if="suggestions.length > 0" class="intention-form__suggestions">
      <p class="intention-form__label">Suggested from your tasks</p>
      <ul class="intention-form__suggestion-list">
        <li v-for="task in suggestions" :key="task.id">
          <button
            class="intention-form__suggestion"
            type="button"
            :disabled="busy"
            @click="submitTask(task)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">add</span>
            <span class="intention-form__suggestion-title">{{ task.title }}</span>
            <QuadrantBadge :task="task" />
          </button>
        </li>
      </ul>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import QuadrantBadge from '@/modules/tasks/components/QuadrantBadge.vue'
import type { Task } from '@/modules/tasks/types'
import type { NewIntention } from '@/modules/assistant/composables/useIntentions'

defineProps<{
  suggestions: Task[]
  busy: boolean
  placeholder: string
}>()

const emit = defineEmits<{
  add: [input: NewIntention]
}>()

const text = ref('')
const whenText = ref('')
const whereText = ref('')
const firstAction = ref('')
const showDetails = ref(false)

function details(): Omit<NewIntention, 'text' | 'task_id'> {
  return { when_text: whenText.value, where_text: whereText.value, first_action: firstAction.value }
}

function reset(): void {
  text.value = ''
  whenText.value = ''
  whereText.value = ''
  firstAction.value = ''
  showDetails.value = false
}

function submitText(): void {
  if (!text.value.trim()) return
  emit('add', { text: text.value, task_id: null, ...details() })
  reset()
}

function submitTask(task: Task): void {
  emit('add', { text: task.title, task_id: task.id, ...details() })
  reset()
}
</script>

<style scoped>
.intention-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.intention-form__row {
  display: flex;
  gap: var(--space-sm);
}

.intention-form__input {
  flex: 1;
  min-width: 0;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background: var(--color-surface);
  outline: none;
  transition: border-color 0.15s;
}

.intention-form__input:focus {
  border-color: var(--color-primary);
}

.intention-form__submit {
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: opacity 0.15s;
}

.intention-form__submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.intention-form__toggle {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  cursor: pointer;
}

.intention-form__toggle:hover {
  color: var(--color-primary);
}

.intention-form__toggle .material-symbols-outlined {
  font-size: 16px;
}

.intention-form__details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-sm);
}

.intention-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.intention-form__label {
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-gray-400);
}

.intention-form__suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.intention-form__suggestion-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.intention-form__suggestion {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-xs) var(--space-sm);
  border: var(--border-width) dashed var(--border-color);
  border-radius: var(--radius-md);
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s;
}

.intention-form__suggestion:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.intention-form__suggestion .material-symbols-outlined {
  font-size: 16px;
  color: var(--color-gray-400);
}

.intention-form__suggestion-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
