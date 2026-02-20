<template>
  <div
    class="kcard"
    :class="{
      'kcard--featured': featured,
      'kcard--done': task.status === 'done',
      'kcard--dragging': isDragging,
    }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <!-- Done card -->
    <template v-if="task.status === 'done'">
      <div class="kcard__done-row">
        <span class="kcard__done-icon">check_circle</span>
        <h3 class="kcard__done-title">{{ task.title }}</h3>
      </div>
    </template>

    <!-- Regular / featured card -->
    <template v-else>
      <h3 class="kcard__title">{{ task.title }}</h3>
      <p v-if="task.description" class="kcard__desc">{{ task.description }}</p>
      <div class="kcard__actions">
        <button
          v-if="featured"
          class="kcard__btn kcard__btn--focus"
          title="Focus"
          @click.stop="$emit('focus', task)"
        >
          <span class="material-symbols-outlined">center_focus_strong</span>
        </button>
        <button class="kcard__btn" title="Edit" @click.stop="$emit('edit', task)">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button
          class="kcard__btn kcard__btn--danger"
          title="Delete"
          @click.stop="$emit('delete', task.id)"
        >
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Task } from '@/modules/tasks/types'

const props = defineProps<{
  task: Task
  featured?: boolean
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
  dragstart: [taskId: string]
  dragend: []
  focus: [task: Task]
}>()

const isDragging = ref(false)

function onDragStart(e: Event): void {
  // eslint-disable-next-line no-undef
  const event = e as DragEvent
  if (!event.dataTransfer) return
  event.dataTransfer.setData('taskId', props.task.id)
  event.dataTransfer.setData('fromStatus', props.task.status)
  event.dataTransfer.effectAllowed = 'move'
  isDragging.value = true
  emit('dragstart', props.task.id)
}

function onDragEnd(): void {
  isDragging.value = false
  emit('dragend')
}
</script>

<style scoped>
.kcard {
  background: var(--color-surface);
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  cursor: grab;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.15s,
    opacity 0.15s;
  position: relative;
}

.kcard:hover {
  border-color: var(--border-color);
  box-shadow: var(--shadow-sm);
}

.kcard:active {
  cursor: grabbing;
}

.kcard--dragging {
  opacity: 0.4;
}

/* ── Featured (first doing card) ── */
.kcard--featured {
  background: var(--color-primary);
  border-color: transparent;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.kcard--featured:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  border-color: transparent;
}

.kcard--featured .kcard__title {
  color: var(--color-surface);
  font-size: var(--font-size-h3);
}

.kcard--featured .kcard__desc {
  color: rgba(255, 255, 255, 0.65);
}

.kcard--featured .kcard__btn {
  color: rgba(255, 255, 255, 0.4);
}

.kcard--featured .kcard__btn:hover {
  color: var(--color-surface);
  background-color: rgba(255, 255, 255, 0.1);
}

/* ── Done card ── */
.kcard--done {
  opacity: 0.6;
  cursor: default;
}

.kcard--done:hover {
  opacity: 1;
  border-color: transparent;
  box-shadow: none;
}

.kcard__done-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.kcard__done-icon {
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  color: #22c55e;
  font-variation-settings: 'FILL' 1;
  flex-shrink: 0;
}

.kcard__done-title {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
  text-decoration: line-through;
  text-decoration-color: var(--color-gray-300);
}

/* ── Regular card content ── */
.kcard__title {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
  line-height: var(--leading-snug);
  margin-bottom: var(--space-xs);
}

.kcard__desc {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  line-height: var(--leading-relaxed);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Actions ── */
.kcard__actions {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: var(--border-width) solid var(--border-color);
  opacity: 0;
  transition: opacity 0.15s;
}

.kcard--featured .kcard__actions {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.kcard:hover .kcard__actions {
  opacity: 1;
}

.kcard__btn {
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

.kcard__btn:hover {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.kcard__btn--danger:hover {
  color: #dc2626;
  background-color: #fef2f2;
}

.kcard__btn--focus:hover {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.kcard__btn .material-symbols-outlined {
  font-size: 15px;
}
</style>
