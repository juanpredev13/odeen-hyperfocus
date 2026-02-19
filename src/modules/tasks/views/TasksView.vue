<template>
  <div class="tasks">

    <!-- Empty state: no tasks anywhere -->
    <template v-if="!loading && !hasAnyTasks">
      <header class="tasks__top-bar">
        <span class="tasks__date">{{ currentDate }}</span>
      </header>

      <div class="tasks__hero">
        <h2 class="tasks__hero-title">
          Ready to<br />Focus?
        </h2>
        <p class="tasks__hero-subtitle">
          {{
            projects.length > 0
              ? 'Your projects are empty. Open one to add your first task.'
              : 'Your workspace is clear. Create a project to get started.'
          }}
        </p>
      </div>

      <div v-if="projects.length > 0" class="tasks__projects-grid">
        <RouterLink
          v-for="p in projects"
          :key="p.id"
          class="tasks__project-card"
          :to="{ name: 'project', params: { slug: toSlug(p.name) } }"
        >
          <div class="tasks__project-card-top">
            <h3 class="tasks__project-card-name">{{ p.name }}</h3>
          </div>
          <div class="tasks__project-card-bottom">
            <div class="tasks__project-card-divider"></div>
            <span class="tasks__project-card-cta">Add your first task</span>
          </div>
        </RouterLink>
      </div>

      <div class="tasks__empty-container">
        <div class="tasks__empty-dashed">
          <h4 class="tasks__empty-dashed-title">No Tasks Yet</h4>
          <p class="tasks__empty-dashed-text">
            {{
              projects.length > 0
                ? 'Select a project above to start adding tasks.'
                : 'Create a project first, then add tasks to it.'
            }}
          </p>
          <RouterLink v-if="projects.length === 0" class="tasks__empty-dashed-link" to="/">
            Create a Project
          </RouterLink>
        </div>
      </div>
    </template>

    <!-- Tasks exist: grouped by project -->
    <template v-else-if="hasAnyTasks">
      <header class="tasks__top-bar">
        <span class="tasks__date">{{ currentDate }}</span>
      </header>

      <div class="tasks__grouped">
        <section
          v-for="group in tasksByProject"
          :key="group.project.id"
          class="tasks__group"
        >
          <div class="tasks__group-header">
            <RouterLink
              class="tasks__group-name"
              :to="{ name: 'project', params: { slug: toSlug(group.project.name) } }"
            >
              {{ group.project.name }}
            </RouterLink>
            <span class="tasks__group-count">{{ group.tasks.length }}</span>
          </div>

          <div class="tasks__list">
            <TaskCard
              v-for="task in group.tasks"
              :key="task.id"
              :task="task"
              @edit="startEdit(task, group.project.id)"
              @delete="handleDelete"
            />
          </div>
        </section>
      </div>

      <TaskForm
        v-if="showForm && editingTask && editingProjectId"
        :task="editingTask"
        :project-id="editingProjectId"
        :loading="saving"
        :error="formError"
        @submit="handleSubmit"
        @cancel="closeForm"
      />
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProjects } from '@/modules/projects/composables/useProjects'
import { fetchAllTasks, updateTask as updateTaskService, deleteTask as deleteTaskService } from '@/modules/tasks/services/tasks.service'
import TaskCard from '@/modules/tasks/components/TaskCard.vue'
import TaskForm from '@/modules/tasks/components/TaskForm.vue'
import type { Task, TaskStatus } from '@/modules/tasks/types'

const { projects, fetchProjects } = useProjects()

const allTasks = ref<Task[]>([])
const loading = ref(false)
const saving = ref(false)
const formError = ref<string | undefined>(undefined)

const showForm = ref(false)
const editingTask = ref<Task | null>(null)
const editingProjectId = ref<string | null>(null)

const currentDate = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

onMounted(async () => {
  loading.value = true
  if (projects.value.length === 0) await fetchProjects()
  const result = await fetchAllTasks()
  if (result.data) allTasks.value = result.data
  loading.value = false
})

const hasAnyTasks = computed(() => allTasks.value.length > 0)

const tasksByProject = computed(() =>
  projects.value
    .map((project) => ({
      project,
      tasks: allTasks.value.filter((t) => t.project_id === project.id),
    }))
    .filter((g) => g.tasks.length > 0),
)

function startEdit(task: Task, projectId: string): void {
  editingTask.value = task
  editingProjectId.value = projectId
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
  editingTask.value = null
  editingProjectId.value = null
  formError.value = undefined
}

async function handleSubmit(payload: {
  title: string
  description: string | null
  status: TaskStatus
}): Promise<void> {
  if (!editingTask.value) return
  saving.value = true
  formError.value = undefined
  const result = await updateTaskService({ id: editingTask.value.id, ...payload })
  saving.value = false
  if (result.error) {
    formError.value = result.error.message
    return
  }
  if (result.data) {
    const idx = allTasks.value.findIndex((t) => t.id === editingTask.value!.id)
    if (idx !== -1) allTasks.value[idx] = result.data
  }
  closeForm()
}

async function handleDelete(id: string): Promise<void> {
  if (!confirm('Delete this task?')) return
  await deleteTaskService(id)
  allTasks.value = allTasks.value.filter((t) => t.id !== id)
}
</script>

<style scoped>
.tasks {
  padding: var(--space-xl);
  max-width: 860px;
}

/* ── Top bar ── */
.tasks__top-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-xl);
}

.tasks__date {
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-primary) 40%, transparent);
}

/* ── Hero ── */
.tasks__hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-2xl, 3rem);
}

.tasks__hero-title {
  font-size: clamp(3rem, 8vw, 5rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 0.9;
  color: var(--color-primary);
}

.tasks__hero-subtitle {
  font-size: var(--font-size-lg, 1.125rem);
  font-weight: var(--font-weight-medium);
  color: color-mix(in srgb, var(--color-primary) 50%, transparent);
  max-width: 400px;
  line-height: 1.6;
}

/* ── Projects grid ── */
.tasks__projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
  text-decoration: none;
}

.tasks__project-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  aspect-ratio: 1;
  padding: var(--space-lg);
  border: var(--border-width) solid var(--color-primary);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  transition: background-color 0.3s, color 0.3s;
}

.tasks__project-card:hover {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.tasks__project-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.tasks__project-card-name {
  font-size: var(--font-size-h3, 1.25rem);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
  color: inherit;
}

.tasks__project-card-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.tasks__project-card-divider {
  width: 100%;
  height: 1px;
  background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
  margin-bottom: var(--space-sm);
}

.tasks__project-card:hover .tasks__project-card-divider {
  background-color: color-mix(in srgb, white 20%, transparent);
}

.tasks__project-card-cta {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  opacity: 0.5;
  color: inherit;
}

.tasks__project-card:hover .tasks__project-card-cta {
  opacity: 1;
}

/* ── Empty state ── */
.tasks__empty-container {
  border-top: 1px solid color-mix(in srgb, var(--color-primary) 5%, transparent);
  padding-top: var(--space-xl);
}

.tasks__empty-dashed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  border: 2px dashed color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: var(--radius-lg, 1rem);
  padding: var(--space-2xl, 3rem) var(--space-lg);
  text-align: center;
}

.tasks__empty-dashed-title {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.01em;
  color: var(--color-primary);
}

.tasks__empty-dashed-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: color-mix(in srgb, var(--color-primary) 40%, transparent);
  max-width: 340px;
  line-height: 1.6;
}

.tasks__empty-dashed-link {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 8px;
  text-decoration-thickness: 1px;
}

.tasks__empty-dashed-link:hover {
  text-decoration-thickness: 2px;
}

/* ── Grouped list ── */
.tasks__grouped {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.tasks__group-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-sm);
  border-bottom: var(--border-width) solid var(--border-color);
}

.tasks__group-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-primary);
  text-decoration: none;
  transition: opacity 0.15s;
}

.tasks__group-name:hover {
  opacity: 0.6;
}

.tasks__group-count {
  font-size: var(--font-size-xs);
  font-family: monospace;
  color: var(--color-gray-400);
}

.tasks__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
