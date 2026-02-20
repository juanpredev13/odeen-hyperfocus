<template>
  <section
    class="kcol"
    :class="{
      'kcol--doing': status === 'doing',
      'kcol--done': status === 'done',
      'kcol--dragover': isDragOver,
    }"
    @dragover.prevent="onDragOver"
    @dragenter.prevent="onDragEnter"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Column header -->
    <div class="kcol__header">
      <div class="kcol__header-left">
        <h2 class="kcol__title">{{ label }}</h2>
        <span v-if="status === 'doing'" class="kcol__pulse"></span>
        <span v-else class="kcol__count">{{ tasks.length }}</span>
      </div>

      <!-- WIP badge (doing column only) -->
      <div
        v-if="status === 'doing'"
        class="kcol__wip"
        :class="{
          'kcol__wip--warn': tasks.length >= 2 && tasks.length < WIP_LIMIT,
          'kcol__wip--full': tasks.length >= WIP_LIMIT,
        }"
      >
        <span v-if="tasks.length >= WIP_LIMIT" class="kcol__wip-icon">warning</span>
        <span class="kcol__wip-text">
          {{
            tasks.length >= WIP_LIMIT ? 'Limit Reached' : tasks.length >= 2 ? 'Limit Near' : 'WIP'
          }}
        </span>
        <span class="kcol__wip-ratio">{{ tasks.length }} / {{ WIP_LIMIT }}</span>
      </div>
    </div>

    <!-- Cards -->
    <div class="kcol__body">
      <KanbanCard
        v-for="(task, i) in tasks"
        :key="task.id"
        :task="task"
        :featured="status === 'doing' && i === 0"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @dragstart="$emit('dragstart', $event)"
        @dragend="$emit('dragend')"
        @focus="$emit('focus', $event)"
      />

      <!-- Drop placeholder (doing column, when dragging) -->
      <div
        v-if="status === 'doing' && isDraggingActive && tasks.length < WIP_LIMIT"
        class="kcol__drop-zone"
      >
        <span class="material-symbols-outlined">ads_click</span>
        <span>Drag here to focus</span>
      </div>

      <!-- Add task button (todo column) -->
      <button v-if="status === 'todo'" class="kcol__add-btn" @click="$emit('add-task')">
        <span class="material-symbols-outlined">add</span>
        Add Task
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import KanbanCard from './KanbanCard.vue'
import type { Task, TaskStatus } from '@/modules/tasks/types'

const WIP_LIMIT = 3

const props = defineProps<{
  status: TaskStatus
  label: string
  tasks: Task[]
  isDraggingActive: boolean
}>()

const emit = defineEmits<{
  drop: [taskId: string, newStatus: TaskStatus]
  edit: [task: Task]
  delete: [id: string]
  'add-task': []
  dragstart: [taskId: string]
  dragend: []
  focus: [task: Task]
}>()

const isDragOver = ref(false)
let dragEnterCount = 0

function onDragEnter(): void {
  dragEnterCount++
  isDragOver.value = true
}

function onDragLeave(): void {
  dragEnterCount--
  if (dragEnterCount <= 0) {
    dragEnterCount = 0
    isDragOver.value = false
  }
}

function onDragOver(e: Event): void {
  // eslint-disable-next-line no-undef
  const event = e as DragEvent
  if (!event.dataTransfer) return
  event.dataTransfer.dropEffect = 'move'
}

function onDrop(e: Event): void {
  isDragOver.value = false
  dragEnterCount = 0

  // eslint-disable-next-line no-undef
  const event = e as DragEvent
  if (!event.dataTransfer) return
  const taskId = event.dataTransfer.getData('taskId')
  const fromStatus = event.dataTransfer.getData('fromStatus')

  if (!taskId || fromStatus === props.status) return
  if (props.status === 'doing' && props.tasks.length >= WIP_LIMIT) return

  emit('drop', taskId, props.status)
}
</script>

<style scoped>
.kcol {
  display: flex;
  flex-direction: column;
  width: 340px;
  min-width: 300px;
  max-width: 380px;
  height: 100%;
  border-radius: var(--radius-lg);
  background: var(--color-background);
  border: var(--border-width) solid var(--border-color);
  flex-shrink: 0;
  transition: border-color 0.2s;
}

/* Doing column: featured, wider */
.kcol--doing {
  flex: 1;
  min-width: 360px;
  max-width: 480px;
  background: var(--color-surface);
  border-width: 2px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
}

/* Done column: slightly faded */
.kcol--done {
  opacity: 0.85;
}

/* Drag-over highlight */
.kcol--dragover {
  border-color: var(--color-primary);
}

/* ── Header ── */
.kcol__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.25rem 0.75rem;
  flex-shrink: 0;
}

.kcol--doing .kcol__header {
  border-bottom: var(--border-width) solid var(--border-color);
  padding-bottom: 1rem;
  margin-bottom: 0;
}

.kcol__header-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.kcol__title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.kcol--doing .kcol__title {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
}

.kcol__count {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  background: var(--color-surface);
  color: var(--color-gray-600);
  padding: 1px 6px;
  border-radius: 4px;
  border: var(--border-width) solid var(--border-color);
}

.kcol__pulse {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: #22c55e;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* ── WIP badge ── */
.kcol__wip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--color-background);
  border: var(--border-width) solid var(--border-color);
  color: var(--color-gray-500);
}

.kcol__wip--warn {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #c2410c;
}

.kcol__wip--full {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.kcol__wip-icon {
  font-family: 'Material Symbols Outlined';
  font-size: 13px;
  font-variation-settings: 'FILL' 0;
}

.kcol__wip-text {
  font-size: 10px;
  letter-spacing: 0.05em;
}

.kcol__wip-ratio {
  font-family: monospace;
  font-size: var(--font-size-xs);
}

/* ── Body ── */
.kcol__body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  scrollbar-width: none;
}

.kcol__body::-webkit-scrollbar {
  display: none;
}

.kcol--doing .kcol__body {
  padding: 1rem;
  gap: 1.25rem;
  background: color-mix(in srgb, var(--color-background) 50%, transparent);
}

/* ── Drop zone placeholder ── */
.kcol__drop-zone {
  height: 120px;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  color: var(--color-gray-300);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.kcol__drop-zone .material-symbols-outlined {
  font-size: 28px;
  opacity: 0.5;
}

/* ── Add task button ── */
.kcol__add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  width: 100%;
  padding: 0.75rem;
  border: 2px dashed var(--color-gray-200);
  border-radius: var(--radius-lg);
  background: none;
  color: var(--color-gray-400);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition:
    border-color 0.2s,
    color 0.2s;
  font-family: var(--font-family);
}

.kcol__add-btn:hover {
  border-color: var(--color-gray-400);
  color: var(--color-gray-600);
}

.kcol__add-btn .material-symbols-outlined {
  font-size: 18px;
}
</style>
