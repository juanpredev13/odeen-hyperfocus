<template>
  <div class="modal-overlay" @click.self="$emit('cancel')" @keydown.esc="$emit('cancel')">
    <div class="modal" role="dialog" aria-modal="true">
      <!-- Close -->
      <button class="modal__close" type="button" aria-label="Close" @click="$emit('cancel')">
        <span class="material-symbols-outlined">close</span>
      </button>

      <form @submit.prevent="handleSubmit" @keydown.enter.exact.prevent="handleSubmit">
        <div class="modal__body">
          <!-- Label -->
          <p class="modal__label">{{ task ? 'Edit Task' : 'New Task' }}</p>

          <!-- Title -->
          <div class="modal__title-field">
            <input
              v-model="form.title"
              class="modal__title-input"
              type="text"
              placeholder="What needs to be done?"
              required
              autofocus
            />
            <div class="modal__title-underline"></div>
          </div>

          <!-- Notes -->
          <textarea
            v-model="form.description"
            class="modal__notes"
            placeholder="Add optional notes..."
            rows="3"
          ></textarea>

          <!-- Meta row -->
          <div class="modal__meta">
            <div class="modal__meta-field">
              <label class="modal__meta-label" for="status">Status</label>
              <select id="status" v-model="form.status" class="modal__select">
                <option value="todo">To Do</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <p v-if="error" class="modal__error">{{ error }}</p>
        </div>

        <!-- Footer -->
        <div class="modal__footer">
          <div class="modal__hint">
            <kbd>ESC</kbd>
            <span>to cancel</span>
          </div>
          <div class="modal__footer-right">
            <div class="modal__hint modal__hint--hidden-sm">
              <kbd>↵ ENTER</kbd>
              <span>to save</span>
            </div>
            <button class="modal__submit" type="submit" :disabled="loading">
              {{ loading ? 'Saving…' : task ? 'Save changes' : 'Create Task' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Task, TaskStatus } from '@/modules/tasks/types'

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
  }]
  cancel: []
}>()

const form = reactive({
  title: props.task?.title ?? '',
  description: props.task?.description ?? '',
  status: (props.task?.status ?? 'todo') as TaskStatus,
})

function handleSubmit(): void {
  if (!form.title.trim()) return
  emit('submit', {
    title: form.title.trim(),
    description: form.description.trim() || null,
    status: form.status,
  })
}
</script>

<style scoped>
/* ── Overlay ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: var(--space-md);
}

/* ── Modal card ── */
.modal {
  position: relative;
  width: 100%;
  max-width: 520px;
  background: var(--color-surface);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* ── Close button ── */
.modal__close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  transition: color 0.15s;
  padding: 0;
}

.modal__close:hover {
  color: var(--color-primary);
}

.modal__close .material-symbols-outlined {
  font-size: 20px;
}

/* ── Body ── */
.modal__body {
  padding: 2rem 2.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── Label ── */
.modal__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-gray-400);
}

/* ── Title field ── */
.modal__title-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.modal__title-field:focus-within .modal__title-underline {
  background-color: var(--color-primary);
}

.modal__title-input {
  width: 100%;
  font-size: 1.5rem;
  font-weight: 600;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  color: var(--color-primary);
  font-family: var(--font-family);
}

.modal__title-input::placeholder {
  color: var(--color-gray-400);
  opacity: 0.6;
}

.modal__title-underline {
  height: 1px;
  width: 100%;
  background-color: var(--border-color);
  transition: background-color 0.2s;
}

/* ── Notes ── */
.modal__notes {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  padding: 0;
  font-size: var(--font-size-body);
  color: var(--color-gray-500);
  font-family: var(--font-family);
  line-height: 1.6;
}

.modal__notes::placeholder {
  color: var(--color-gray-400);
}

/* ── Meta row ── */
.modal__meta {
  display: flex;
  gap: var(--space-md);
  padding-top: var(--space-sm);
  border-top: var(--border-width) solid var(--border-color);
}

.modal__meta-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.modal__meta-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-gray-400);
}

.modal__select {
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background: var(--color-surface);
  outline: none;
  font-family: var(--font-family);
  transition: border-color 0.15s;
}

.modal__select:focus {
  border-color: var(--color-primary);
}

/* ── Error ── */
.modal__error {
  font-size: var(--font-size-sm);
  color: #dc2626;
}

/* ── Footer ── */
.modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2.5rem 1.5rem;
  border-top: var(--border-width) solid var(--border-color);
}

.modal__footer-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.modal__hint {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--font-size-sm);
  color: var(--color-gray-400);
}

.modal__hint--hidden-sm {
  display: none;
}

@media (min-width: 640px) {
  .modal__hint--hidden-sm {
    display: flex;
  }
}

.modal__hint kbd {
  padding: 2px 6px;
  border: var(--border-width) solid var(--border-color);
  border-radius: 4px;
  background: var(--color-background);
  font-size: 10px;
  font-family: monospace;
  color: var(--color-gray-500);
}

/* ── Submit ── */
.modal__submit {
  padding: 0.625rem 1.75rem;
  background-color: var(--color-primary);
  color: var(--color-surface);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  font-family: var(--font-family);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.modal__submit:hover {
  opacity: 0.9;
}

.modal__submit:active {
  transform: scale(0.97);
}

.modal__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
