<template>
  <div class="capture-inbox">
    <header class="capture-inbox__header">
      <h1 class="capture-inbox__title">Inbox</h1>
      <p class="capture-inbox__subtitle">Get it out of your head now, decide what to do with it later.</p>
    </header>

    <AssistantNav />

    <form class="capture-inbox__add" @submit.prevent="add">
      <input
        v-model="draft"
        class="capture-inbox__input"
        type="text"
        :maxlength="MAX_CAPTURE_LENGTH"
        placeholder="Capture something… (idea: / problem: / worry: / waiting:)"
        aria-label="New capture"
      />
      <button class="capture-inbox__add-btn" type="submit" :disabled="!isValidCaptureText(draft)">Capture</button>
    </form>

    <div class="capture-inbox__tabs" role="tablist" aria-label="Captures">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="capture-inbox__tab"
        :class="{ 'capture-inbox__tab--active': tab === t.id }"
        type="button"
        role="tab"
        :aria-selected="tab === t.id"
        @click="tab = t.id"
      >
        {{ t.label }}
        <span class="capture-inbox__tab-count">{{ t.count }}</span>
      </button>
    </div>

    <p v-if="error" class="capture-inbox__error" role="alert">{{ error.message }}</p>

    <ul v-if="visible.length > 0" class="capture-inbox__list">
      <CaptureItem
        v-for="c in visible"
        :key="c.id"
        :capture="c"
        :projects="projects"
        :tasks="tasks"
        :default-project-id="activeProject?.id"
        @set-kind="setKind"
        @toggle-pin="togglePin"
        @convert="handleConvert"
        @attach="handleAttach"
        @archive="archive"
        @restore="restore"
        @remove="remove"
      />
    </ul>

    <section v-else class="capture-inbox__empty">
      <span class="material-symbols-outlined capture-inbox__empty-icon" aria-hidden="true">inbox</span>
      <p class="capture-inbox__empty-text">{{ emptyText }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import AssistantNav from '@/modules/assistant/components/AssistantNav.vue'
import CaptureItem from '@/modules/assistant/components/CaptureItem.vue'
import { useCaptures } from '@/modules/assistant/composables/useCaptures'
import { isValidCaptureText, MAX_CAPTURE_LENGTH } from '@/modules/assistant/composables/captureHelpers'
import { useProjects } from '@/modules/projects/composables/useProjects'
import { fetchAllTasks } from '@/modules/tasks/services/tasks.service'
import type { Task } from '@/modules/tasks/types'

type Tab = 'inbox' | 'pinned' | 'processed'

const {
  inbox,
  processed,
  pinned,
  error,
  load,
  capture,
  setKind,
  togglePin,
  archive,
  restore,
  attach,
  convert,
  remove,
} = useCaptures()
const { projects, activeProject, fetchProjects } = useProjects()

const tab = ref<Tab>('inbox')
const draft = ref('')
const tasks = shallowRef<Task[]>([])

const tabs = computed(() => [
  { id: 'inbox' as const, label: 'Inbox', count: inbox.value.length },
  { id: 'pinned' as const, label: 'Pinned problems', count: pinned.value.length },
  { id: 'processed' as const, label: 'Processed', count: processed.value.length },
])

const visible = computed(() => {
  if (tab.value === 'pinned') return pinned.value
  if (tab.value === 'processed') return processed.value
  return inbox.value
})

const emptyText = computed(() => {
  if (tab.value === 'pinned') return 'No pinned problems. Pin a problem to keep it ready for a problem-crunching session.'
  if (tab.value === 'processed') return 'Nothing processed yet.'
  return 'Inbox zero. Press Alt+C anywhere to capture a thought without losing focus.'
})

async function loadTasks(): Promise<void> {
  const result = await fetchAllTasks()
  if (result.data) tasks.value = result.data
}

onMounted(async () => {
  await Promise.all([load(), fetchProjects(), loadTasks()])
})

async function add(): Promise<void> {
  if (!isValidCaptureText(draft.value)) return
  const saved = await capture(draft.value)
  if (saved) draft.value = ''
}

async function handleConvert(id: string, projectId: string): Promise<void> {
  if (await convert(id, projectId)) await loadTasks()
}

async function handleAttach(id: string, taskId: string): Promise<void> {
  if (await attach(id, taskId)) await loadTasks()
}
</script>

<style scoped>
.capture-inbox {
  padding: var(--space-xl);
  max-width: 960px;
  overflow-y: auto;
  height: 100%;
}

.capture-inbox__header {
  margin-bottom: var(--space-md);
}

.capture-inbox__title {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-primary);
}

.capture-inbox__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.capture-inbox__add {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.capture-inbox__input {
  flex: 1;
  min-width: 0;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-family);
  font-size: var(--font-size-body);
  color: var(--color-primary);
  background: var(--color-surface);
  outline: none;
}

.capture-inbox__input:focus {
  border-color: var(--color-primary);
}

.capture-inbox__add-btn {
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.capture-inbox__add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.capture-inbox__tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
  border-bottom: var(--border-width) solid var(--border-color);
}

.capture-inbox__tab {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: -1px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
  cursor: pointer;
}

.capture-inbox__tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.capture-inbox__tab-count {
  font-family: monospace;
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}

.capture-inbox__error {
  margin-bottom: var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}

.capture-inbox__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-bottom: calc(var(--space-xl) + var(--space-lg));
}

.capture-inbox__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) var(--space-md);
  border: var(--border-width) dashed var(--border-color);
  border-radius: var(--radius-lg);
  text-align: center;
}

.capture-inbox__empty-icon {
  font-size: var(--icon-size);
  color: var(--color-gray-400);
}

.capture-inbox__empty-text {
  max-width: 400px;
  font-size: var(--font-size-sm);
  line-height: var(--leading-normal);
  color: var(--color-gray-500);
}
</style>
