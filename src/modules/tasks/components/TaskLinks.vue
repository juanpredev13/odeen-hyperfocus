<template>
  <section class="task-links" aria-labelledby="task-links-label">
    <p id="task-links-label" class="task-links__label">Links</p>

    <ul v-if="links.length" class="task-links__list">
      <li v-for="link in links" :key="link.id" class="task-links__item">
        <TaskLinkIcon :kind="link.kind" />

        <a
          class="task-links__anchor"
          :href="link.url"
          :target="link.kind === 'github_issue' ? '_blank' : undefined"
          rel="noopener noreferrer"
        >
          <span class="task-links__name">{{ link.label }}</span>
          <span v-if="issueTitle(link)" class="task-links__title">{{ issueTitle(link) }}</span>
          <span v-else-if="link.kind === 'obsidian_note'" class="task-links__title">
            Open in Obsidian
          </span>
        </a>

        <span
          v-if="link.kind === 'github_issue'"
          class="task-links__state"
          :class="`task-links__state--${issueStateModifier(link)}`"
          :title="issueError(link)"
        >
          {{ issueStateLabel(link) }}
        </span>

        <button
          class="task-links__remove"
          type="button"
          :aria-label="`Remove ${link.label}`"
          @click="removeLink(link.id)"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </li>
    </ul>

    <div class="task-links__add">
      <div class="task-links__field">
        <TaskLinkIcon v-if="detectedKind" class="task-links__field-icon" :kind="detectedKind" />
        <span
          v-else
          class="material-symbols-outlined task-links__field-icon task-links__field-icon--idle"
          aria-hidden="true"
        >
          link
        </span>
        <input
          v-model="input"
          class="task-links__input"
          type="text"
          placeholder="owner/repo#123, issue URL or Obsidian note"
          aria-label="GitHub issue or Obsidian note"
          @keydown.enter.stop.prevent="handleAdd"
        />
      </div>
      <button
        class="task-links__button"
        type="button"
        :disabled="loading || !input.trim()"
        @click="handleAdd"
      >
        Add
      </button>
    </div>

    <p class="task-links__hint">
      Obsidian: use "Copy Obsidian URL" on the note, or type Vault/path/to/note.
    </p>
    <p v-if="error" class="task-links__error">{{ error.message }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import TaskLinkIcon from '@/modules/tasks/components/TaskLinkIcon.vue'
import { parseTaskLink } from '@/modules/tasks/composables/taskLinkHelpers'
import { useTaskLinks } from '@/modules/tasks/composables/useTaskLinks'
import type { TaskLink } from '@/modules/tasks/types'

const props = defineProps<{
  taskId: string
}>()

const { links, loading, error, fetchLinks, addLink, removeLink, issueStatus } = useTaskLinks(
  props.taskId,
)

const input = ref('')

const detectedKind = computed(() => parseTaskLink(input.value)?.kind ?? null)

onMounted(fetchLinks)

async function handleAdd(): Promise<void> {
  if (!input.value.trim()) return
  if (await addLink(input.value)) input.value = ''
}

function issueTitle(link: TaskLink): string | null {
  const status = issueStatus(link.url)
  return status?.state === 'ready' ? status.info.title : null
}

function issueStateModifier(link: TaskLink): string {
  const status = issueStatus(link.url)
  if (status?.state === 'ready') return status.info.state
  return status?.state === 'error' ? 'unknown' : 'loading'
}

function issueStateLabel(link: TaskLink): string {
  const status = issueStatus(link.url)
  if (status?.state === 'ready') return status.info.state === 'open' ? 'Open' : 'Closed'
  return status?.state === 'error' ? 'Unknown' : '…'
}

function issueError(link: TaskLink): string | undefined {
  const status = issueStatus(link.url)
  return status?.state === 'error' ? status.message : undefined
}
</script>

<style scoped>
.task-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: var(--border-width) solid var(--border-color);
}

.task-links__label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-400);
}

.task-links__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

.task-links__item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.task-links__anchor {
  display: flex;
  flex: 1;
  align-items: baseline;
  gap: var(--space-sm);
  min-width: 0;
  color: var(--color-primary);
  text-decoration: none;
}

.task-links__anchor:hover .task-links__name {
  text-decoration: underline;
}

.task-links__anchor:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.task-links__name {
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.task-links__title {
  overflow: hidden;
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-links__state {
  flex-shrink: 0;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: 700;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.task-links__state--open {
  background: var(--color-status-active);
  color: var(--color-status-active-text);
}

.task-links__state--closed {
  background: var(--color-status-done);
  color: var(--color-status-done-text);
}

.task-links__state--loading,
.task-links__state--unknown {
  background: var(--color-status-neutral);
  color: var(--color-status-neutral-text);
}

.task-links__remove {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-gray-400);
  cursor: pointer;
  transition: color 0.15s;
}

.task-links__remove:hover {
  color: var(--color-danger-text);
}

.task-links__remove .material-symbols-outlined {
  font-size: var(--icon-size-sm);
}

.task-links__add {
  display: flex;
  gap: var(--space-sm);
}

.task-links__field {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
}

.task-links__field-icon {
  position: absolute;
  top: 50%;
  left: var(--space-sm);
  transform: translateY(-50%);
  pointer-events: none;
}

.task-links__field-icon--idle {
  font-size: var(--icon-size-sm);
  color: var(--color-gray-400);
}

.task-links__input {
  flex: 1;
  min-width: 0;
  padding: var(--space-xs) var(--space-sm) var(--space-xs) calc(var(--space-sm) * 2 + 16px);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-primary);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  outline: none;
  transition: border-color 0.15s;
}

.task-links__input:focus {
  border-color: var(--color-primary);
}

.task-links__input::placeholder {
  color: var(--color-gray-400);
}

.task-links__button {
  padding: var(--space-xs) var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-primary);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: border-color 0.15s;
}

.task-links__button:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.task-links__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.task-links__hint {
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}

.task-links__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}
</style>
