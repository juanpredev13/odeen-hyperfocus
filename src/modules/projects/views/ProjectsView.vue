<template>
  <div class="projects">
    <header class="projects__header">
      <h1 class="projects__title">Projects</h1>

      <button class="projects__add-btn" @click="showForm = true">
        <span class="material-symbols-outlined">add</span>
        New project
      </button>
    </header>

    <!-- Create form -->
    <form v-if="showForm" class="projects__form" @submit.prevent="handleCreate">
      <input
        ref="inputRef"
        v-model="newName"
        class="projects__form-input"
        type="text"
        placeholder="Project name"
        required
      />
      <div class="projects__form-actions">
        <button class="projects__form-submit" type="submit" :disabled="loading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button class="projects__form-cancel" type="button" @click="cancelForm">Cancel</button>
      </div>
    </form>

    <p v-if="error" class="projects__error">{{ error.message }}</p>

    <!-- List -->
    <ul v-if="projects.length > 0" class="projects__list">
      <li
        v-for="project in projects"
        :key="project.id"
        class="project-card"
        :class="{ 'project-card--active': activeProject?.id === project.id }"
        @click="selectProject(project)"
      >
        <div v-if="editingId === project.id" class="project-card__edit">
          <input
            v-model="editName"
            class="project-card__edit-input"
            type="text"
            @keydown.enter="handleUpdate(project.id)"
            @keydown.escape="cancelEdit"
            @click.stop
          />
          <button class="project-card__edit-save" @click.stop="handleUpdate(project.id)">
            <span class="material-symbols-outlined">check</span>
          </button>
          <button class="project-card__edit-cancel" @click.stop="cancelEdit">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <template v-else>
          <div class="project-card__body">
            <span class="project-card__name">{{ project.name }}</span>
            <span class="project-card__date">{{ formatDate(project.created_at) }}</span>
          </div>

          <div class="project-card__actions">
            <button
              class="project-card__action-btn"
              title="Edit"
              @click.stop="startEdit(project)"
            >
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button
              class="project-card__action-btn project-card__action-btn--danger"
              title="Delete"
              @click.stop="handleDelete(project.id)"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </template>
      </li>
    </ul>

    <p v-else-if="!loading" class="projects__empty">
      No projects yet. Create your first one.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProjects } from '@/modules/projects/composables/useProjects'
import type { Project } from '@/modules/projects/types'

const router = useRouter()
const { projects, activeProject, loading, error, fetchProjects, createProject, updateProject, deleteProject } =
  useProjects()

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

function selectProject(project: Project): void {
  router.push({ name: 'project', params: { slug: toSlug(project.name) } })
}

const showForm = ref(false)
const newName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const editingId = ref<string | null>(null)
const editName = ref('')

onMounted(fetchProjects)

async function handleCreate(): Promise<void> {
  const success = await createProject(newName.value.trim())
  if (success) cancelForm()
}

function cancelForm(): void {
  showForm.value = false
  newName.value = ''
}

function startEdit(project: Project): void {
  editingId.value = project.id
  editName.value = project.name
}

async function handleUpdate(id: string): Promise<void> {
  const name = editName.value.trim()
  if (!name) return
  await updateProject(id, name)
  cancelEdit()
}

function cancelEdit(): void {
  editingId.value = null
  editName.value = ''
}

async function handleDelete(id: string): Promise<void> {
  if (!confirm('Delete this project? This cannot be undone.')) return
  await deleteProject(id)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

watch(showForm, async (val) => {
  if (val) {
    await nextTick()
    inputRef.value?.focus()
  }
})
</script>

<style scoped>
.projects {
  padding: var(--space-xl);
  max-width: 720px;
  overflow-y: auto;
  height: 100%;
}

.projects__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.projects__title {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
}

.projects__add-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: opacity 0.15s;
}

.projects__add-btn:hover {
  opacity: 0.85;
}

/* Create form */
.projects__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.projects__form-input {
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-body);
  color: var(--color-primary);
  outline: none;
  transition: border-color 0.2s;
}

.projects__form-input:focus {
  border-color: var(--color-primary);
}

.projects__form-actions {
  display: flex;
  gap: var(--space-sm);
}

.projects__form-submit {
  padding: var(--space-xs) var(--space-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.projects__form-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.projects__form-cancel {
  padding: var(--space-xs) var(--space-md);
  background: none;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  cursor: pointer;
}

.projects__error {
  font-size: var(--font-size-sm);
  color: #dc2626;
  margin-bottom: var(--space-md);
}

.projects__empty {
  font-size: var(--font-size-sm);
  color: var(--color-gray-400);
  margin-top: var(--space-lg);
}

/* Project list */
.projects__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* Project card */
.project-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.project-card:hover {
  border-color: var(--color-gray-300);
  box-shadow: var(--shadow-sm);
}

.project-card--active {
  border-color: var(--color-primary);
}

.project-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-card__name {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.project-card__date {
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}

.project-card__actions {
  display: flex;
  gap: var(--space-xs);
  opacity: 0;
  transition: opacity 0.15s;
}

.project-card:hover .project-card__actions {
  opacity: 1;
}

.project-card__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  border-radius: var(--radius-md);
  color: var(--color-gray-400);
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
}

.project-card__action-btn:hover {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.project-card__action-btn--danger:hover {
  color: #dc2626;
  background-color: #fef2f2;
}

.project-card__action-btn .material-symbols-outlined {
  font-size: 18px;
}

/* Inline edit */
.project-card__edit {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
}

.project-card__edit-input {
  flex: 1;
  border: var(--border-width) solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-body);
  color: var(--color-primary);
  outline: none;
}

.project-card__edit-save,
.project-card__edit-cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.15s;
}

.project-card__edit-save {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.project-card__edit-cancel {
  background-color: var(--color-background);
  color: var(--color-gray-500);
}

.project-card__edit-save .material-symbols-outlined,
.project-card__edit-cancel .material-symbols-outlined {
  font-size: 18px;
}
</style>
