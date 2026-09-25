<template>
  <li class="capture-item" :class="[`capture-item--${capture.status}`, { 'capture-item--pinned': capture.pinned }]">
    <div class="capture-item__main">
      <span class="material-symbols-outlined capture-item__icon" aria-hidden="true">{{ kindInfo.icon }}</span>

      <div class="capture-item__body">
        <p class="capture-item__text">{{ capture.text }}</p>
        <p class="capture-item__meta">
          <select
            v-if="isInbox"
            class="capture-item__kind"
            :value="capture.kind"
            aria-label="Kind"
            @change="emit('set-kind', capture.id, ($event.target as HTMLSelectElement).value as CaptureKind)"
          >
            <option v-for="k in CAPTURE_KINDS" :key="k.id" :value="k.id">{{ k.label }}</option>
          </select>
          <span v-else class="capture-item__kind-label">{{ kindInfo.label }}</span>
          <span aria-hidden="true">·</span>
          <time :datetime="capture.created_at">{{ timeAgo(capture.created_at) }}</time>
          <template v-if="!isInbox">
            <span aria-hidden="true">·</span>
            <span class="capture-item__outcome">{{ outcome }}</span>
          </template>
        </p>
      </div>

      <div class="capture-item__actions">
        <template v-if="isInbox">
          <button
            v-if="capture.kind === 'problem'"
            class="capture-item__btn"
            :class="{ 'capture-item__btn--active': capture.pinned }"
            type="button"
            :aria-pressed="capture.pinned"
            :aria-label="capture.pinned ? 'Unpin problem' : 'Pin problem for incubation'"
            :title="capture.pinned ? 'Unpin' : 'Pin for incubation'"
            @click="emit('toggle-pin', capture)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">keep</span>
          </button>
          <button class="capture-item__btn" type="button" aria-label="Convert to task" title="Convert to task" @click="mode = mode === 'convert' ? 'idle' : 'convert'">
            <span class="material-symbols-outlined" aria-hidden="true">add_task</span>
          </button>
          <button class="capture-item__btn" type="button" aria-label="Attach to task" title="Attach to task" @click="mode = mode === 'attach' ? 'idle' : 'attach'">
            <span class="material-symbols-outlined" aria-hidden="true">link</span>
          </button>
          <button class="capture-item__btn" type="button" aria-label="Archive" title="Archive" @click="emit('archive', capture.id)">
            <span class="material-symbols-outlined" aria-hidden="true">archive</span>
          </button>
        </template>
        <button
          v-else
          class="capture-item__btn"
          type="button"
          aria-label="Move back to inbox"
          title="Move back to inbox"
          @click="emit('restore', capture.id)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">undo</span>
        </button>
        <button
          class="capture-item__btn capture-item__btn--danger"
          type="button"
          aria-label="Delete"
          title="Delete"
          @click="emit('remove', capture.id)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">delete</span>
        </button>
      </div>
    </div>

    <form v-if="mode === 'convert'" class="capture-item__process" @submit.prevent="submitConvert">
      <label class="capture-item__process-label" :for="`convert-${capture.id}`">New task in</label>
      <select :id="`convert-${capture.id}`" v-model="projectId" class="capture-item__select" required>
        <option disabled value="">Choose a project</option>
        <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <button class="capture-item__confirm" type="submit" :disabled="!projectId">Create task</button>
    </form>

    <form v-if="mode === 'attach'" class="capture-item__process" @submit.prevent="submitAttach">
      <label class="capture-item__process-label" :for="`attach-${capture.id}`">Add as a note to</label>
      <select :id="`attach-${capture.id}`" v-model="taskId" class="capture-item__select" required>
        <option disabled value="">Choose a task</option>
        <option v-for="t in openTasks" :key="t.id" :value="t.id">{{ t.title }}</option>
      </select>
      <button class="capture-item__confirm" type="submit" :disabled="!taskId">Attach</button>
    </form>
  </li>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CAPTURE_KINDS, getKindInfo, timeAgo } from '@/modules/assistant/composables/captureHelpers'
import type { Project } from '@/modules/projects/types'
import type { Task } from '@/modules/tasks/types'
import type { Capture, CaptureKind } from '@/modules/assistant/types'

const props = defineProps<{
  capture: Capture
  projects: Project[]
  tasks: Task[]
  defaultProjectId?: string
}>()

const emit = defineEmits<{
  'set-kind': [id: string, kind: CaptureKind]
  'toggle-pin': [capture: Capture]
  convert: [id: string, projectId: string]
  attach: [id: string, taskId: string]
  archive: [id: string]
  restore: [id: string]
  remove: [id: string]
}>()

const mode = ref<'idle' | 'convert' | 'attach'>('idle')
const projectId = ref(props.defaultProjectId ?? '')
const taskId = ref('')

const isInbox = computed(() => props.capture.status === 'inbox')
const kindInfo = computed(() => getKindInfo(props.capture.kind))
const openTasks = computed(() => props.tasks.filter((t) => t.status !== 'done'))

const outcome = computed(() => {
  if (props.capture.status === 'archived') return 'Archived'
  const task = props.tasks.find((t) => t.id === props.capture.task_id)
  return task ? `On task “${task.title}”` : 'Moved to a task'
})

function submitConvert(): void {
  if (!projectId.value) return
  emit('convert', props.capture.id, projectId.value)
  mode.value = 'idle'
}

function submitAttach(): void {
  if (!taskId.value) return
  emit('attach', props.capture.id, taskId.value)
  mode.value = 'idle'
}
</script>

<style scoped>
.capture-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.capture-item--pinned {
  border-color: var(--color-primary);
}

.capture-item--converted,
.capture-item--archived {
  opacity: 0.75;
}

.capture-item__main {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
}

.capture-item__icon {
  font-size: var(--icon-size-sm);
  color: var(--color-gray-400);
  padding-top: 2px;
}

.capture-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.capture-item__text {
  font-size: var(--font-size-body);
  color: var(--color-primary);
  line-height: var(--leading-snug);
  overflow-wrap: anywhere;
}

.capture-item__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}

.capture-item__kind {
  border: none;
  background: none;
  padding: 0;
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
  cursor: pointer;
}

.capture-item__kind-label {
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
}

.capture-item__actions {
  display: flex;
  gap: 2px;
}

.capture-item__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  color: var(--color-gray-400);
  cursor: pointer;
  transition:
    color 0.15s,
    background-color 0.15s;
}

.capture-item__btn:hover,
.capture-item__btn--active {
  color: var(--color-primary);
  background: var(--color-background);
}

.capture-item__btn--danger:hover {
  color: var(--color-danger-text);
  background: var(--color-danger-bg);
}

.capture-item__btn .material-symbols-outlined {
  font-size: 18px;
}

.capture-item__process {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  padding-left: calc(var(--icon-size-sm) + var(--space-md));
}

.capture-item__process-label {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.capture-item__select {
  min-width: 200px;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-sm);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background: var(--color-surface);
}

.capture-item__confirm {
  padding: var(--space-xs) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.capture-item__confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
