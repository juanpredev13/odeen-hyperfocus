<template>
  <div class="task-form-overlay" @click.self="$emit('cancel')">
    <div class="task-form">
      <h2 class="task-form__title">{{ task ? 'Edit task' : 'New task' }}</h2>

      <form @submit.prevent="handleSubmit">
        <div class="task-form__field">
          <label class="task-form__label" for="title">Title</label>
          <input
            id="title"
            v-model="form.title"
            class="task-form__input"
            type="text"
            required
            autofocus
          />
        </div>

        <div class="task-form__field">
          <label class="task-form__label" for="description">Description</label>
          <textarea
            id="description"
            v-model="form.description"
            class="task-form__textarea"
            rows="3"
          ></textarea>
        </div>

        <div class="task-form__row">
          <div class="task-form__field">
            <label class="task-form__label" for="status">Status</label>
            <select id="status" v-model="form.status" class="task-form__select">
              <option value="todo">To Do</option>
              <option value="doing">Doing</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div class="task-form__field">
            <label class="task-form__label">Energy (1–3)</label>
            <div class="task-form__dots">
              <button
                v-for="i in 3"
                :key="i"
                type="button"
                class="task-form__dot-btn"
                :class="{ 'task-form__dot-btn--active': i <= form.energy_level }"
                @click="form.energy_level = i as EnergyLevel"
              >{{ i }}</button>
            </div>
          </div>

          <div class="task-form__field">
            <label class="task-form__label">Impact (1–5)</label>
            <div class="task-form__dots">
              <button
                v-for="i in 5"
                :key="i"
                type="button"
                class="task-form__dot-btn"
                :class="{ 'task-form__dot-btn--active': i <= form.impact_score }"
                @click="form.impact_score = i as ImpactScore"
              >{{ i }}</button>
            </div>
          </div>
        </div>

        <p v-if="error" class="task-form__error">{{ error }}</p>

        <div class="task-form__actions">
          <button class="task-form__submit" type="submit" :disabled="loading">
            {{ loading ? 'Saving…' : task ? 'Save changes' : 'Create task' }}
          </button>
          <button class="task-form__cancel" type="button" @click="$emit('cancel')">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Task, TaskStatus, EnergyLevel, ImpactScore } from '@/modules/tasks/types'

const props = defineProps<{
  task?: Task
  projectId: string
  loading: boolean
  error?: string
}>()

const emit = defineEmits<{
  submit: [payload: {
    title: string
    description: string | null
    status: TaskStatus
    energy_level: EnergyLevel
    impact_score: ImpactScore
  }]
  cancel: []
}>()

const form = reactive({
  title: props.task?.title ?? '',
  description: props.task?.description ?? '',
  status: (props.task?.status ?? 'todo') as TaskStatus,
  energy_level: (props.task?.energy_level ?? 1) as EnergyLevel,
  impact_score: (props.task?.impact_score ?? 1) as ImpactScore,
})

function handleSubmit(): void {
  emit('submit', {
    title: form.title.trim(),
    description: form.description.trim() || null,
    status: form.status,
    energy_level: form.energy_level,
    impact_score: form.impact_score,
  })
}
</script>

<style scoped>
.task-form-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--space-md);
}

.task-form {
  background-color: var(--color-surface);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  width: 100%;
  max-width: 520px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.task-form__title {
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.task-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.task-form__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.task-form__input,
.task-form__textarea,
.task-form__select {
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-body);
  color: var(--color-primary);
  background-color: var(--color-surface);
  outline: none;
  transition: border-color 0.2s;
  font-family: var(--font-family);
}

.task-form__input:focus,
.task-form__textarea:focus,
.task-form__select:focus {
  border-color: var(--color-primary);
}

.task-form__textarea {
  resize: vertical;
}

.task-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-md);
}

.task-form__dots {
  display: flex;
  gap: var(--space-xs);
}

.task-form__dot-btn {
  width: 32px;
  height: 32px;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background: none;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-400);
  cursor: pointer;
  transition: all 0.15s;
}

.task-form__dot-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.task-form__dot-btn--active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-surface);
}

.task-form__error {
  font-size: var(--font-size-sm);
  color: #dc2626;
}

.task-form__actions {
  display: flex;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
}

.task-form__submit {
  padding: var(--space-sm) var(--space-lg);
  background-color: var(--color-primary);
  color: var(--color-surface);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: opacity 0.15s;
}

.task-form__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.task-form__cancel {
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  cursor: pointer;
}
</style>
