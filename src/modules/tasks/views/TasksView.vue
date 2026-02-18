<template>
  <div class="tasks">
    <!-- No project selected: hero + project grid -->
    <template v-if="!activeProject">
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
              ? 'Select a project to begin your deep work session.'
              : 'Your workspace is clear. Create a project to get started.'
          }}
        </p>
      </div>

      <!-- Projects grid -->
      <div v-if="projects.length > 0" class="tasks__projects-grid">
        <button
          v-for="p in projects"
          :key="p.id"
          class="tasks__project-card"
          @click="handleProjectCardClick(p)"
        >
          <div class="tasks__project-card-top">
            <h3 class="tasks__project-card-name">{{ p.name }}</h3>
          </div>
          <div class="tasks__project-card-bottom">
            <div class="tasks__project-card-divider"></div>
            <span class="tasks__project-card-cta">Add your first task</span>
          </div>
        </button>
      </div>

      <!-- Actions -->
      <div v-if="projects.length > 0" class="tasks__actions">
        <RouterLink class="tasks__btn tasks__btn--outline" to="/">Manage Projects</RouterLink>
      </div>

      <!-- Empty state dashed box -->
      <div class="tasks__empty-container">
        <div class="tasks__empty-dashed">
          <h4 class="tasks__empty-dashed-title">No Active Projects</h4>
          <p class="tasks__empty-dashed-text">
            {{
              projects.length > 0
                ? 'Select a project above to start working on tasks.'
                : 'You currently have no tasks in your queue. Create a project to organize your work.'
            }}
          </p>
          <RouterLink v-if="projects.length === 0" class="tasks__empty-dashed-link" to="/">
            Create a Project
          </RouterLink>
        </div>
      </div>
    </template>

    <!-- Project selected: task list -->
    <template v-else>
      <header class="tasks__header">
        <div class="tasks__header-left">
          <button class="tasks__back-btn" @click="handleBack">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 class="tasks__title">{{ activeProject.name }}</h1>
          <span class="tasks__count">{{ tasks.length }} tasks</span>
        </div>
        <button class="tasks__add-btn" @click="showForm = true">
          <span class="material-symbols-outlined">add</span>
          New task
        </button>
      </header>

      <p v-if="error" class="tasks__error" @click="clearError">{{ error.message }}</p>

      <div class="tasks__list">
        <TaskCard
          v-for="task in tasks"
          :key="task.id"
          :task="task"
          @edit="startEdit"
          @delete="handleDelete"
        />

        <p v-if="!loading && tasks.length === 0" class="tasks__empty">
          No tasks yet. Create your first one.
        </p>
      </div>

      <TaskForm
        v-if="showForm"
        :task="editingTask ?? undefined"
        :project-id="activeProject.id"
        :loading="loading"
        :error="error?.message"
        @submit="handleSubmit"
        @cancel="closeForm"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useTasks } from '@/modules/tasks/composables/useTasks'
import { useProjects } from '@/modules/projects/composables/useProjects'
import { useActiveProject } from '@/store/activeProject'
import TaskCard from '@/modules/tasks/components/TaskCard.vue'
import TaskForm from '@/modules/tasks/components/TaskForm.vue'
import type { Task, TaskStatus, EnergyLevel, ImpactScore } from '@/modules/tasks/types'
import type { Project } from '@/modules/projects/types'

const { projects, fetchProjects, selectProject } = useProjects()
const { activeProject, clearActiveProject } = useActiveProject()
const { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, clearError } =
  useTasks()

const showForm = ref(false)
const editingTask = ref<Task | null>(null)
const autoOpenForm = ref(false)

const currentDate = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

onMounted(async () => {
  if (projects.value.length === 0) await fetchProjects()
  if (activeProject.value) fetchTasks(activeProject.value.id)
})

watch(activeProject, async (project) => {
  if (!project) return
  await fetchTasks(project.id)
  if (autoOpenForm.value && tasks.value.length === 0) {
    showForm.value = true
  }
  autoOpenForm.value = false
})

function handleProjectCardClick(project: Project): void {
  autoOpenForm.value = true
  selectProject(project)
}

function handleBack(): void {
  clearActiveProject()
}

function startEdit(task: Task): void {
  editingTask.value = task
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
  editingTask.value = null
}

async function handleSubmit(payload: {
  title: string
  description: string | null
  status: TaskStatus
  energy_level: EnergyLevel
  impact_score: ImpactScore
}): Promise<void> {
  if (editingTask.value) {
    await updateTask({ id: editingTask.value.id, ...payload })
  } else {
    if (!activeProject.value) return
    await createTask({ project_id: activeProject.value.id, ...payload })
  }

  if (!error.value) closeForm()
}

async function handleDelete(id: string): Promise<void> {
  if (!confirm('Delete this task?')) return
  await deleteTask(id)
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

/* ── Actions row ── */
.tasks__actions {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
  margin-bottom: var(--space-xl);
}

.tasks__btn {
  display: inline-flex;
  align-items: center;
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  border: var(--border-width) solid var(--color-primary);
}

.tasks__btn--primary {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.tasks__btn--primary:hover {
  opacity: 0.9;
}

.tasks__btn--outline {
  background: transparent;
  color: var(--color-primary);
}

.tasks__btn--outline:hover {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

/* ── Empty state dashed ── */
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

/* ── Task list header ── */
.tasks__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.tasks__header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.tasks__back-btn {
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

.tasks__back-btn:hover {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.tasks__back-btn .material-symbols-outlined {
  font-size: 20px;
}

.tasks__title {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
}

.tasks__count {
  font-size: var(--font-size-sm);
  color: var(--color-gray-400);
  font-family: monospace;
}

.tasks__add-btn {
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

.tasks__add-btn:hover {
  opacity: 0.85;
}

/* ── Task list ── */
.tasks__error {
  font-size: var(--font-size-sm);
  color: #dc2626;
  margin-bottom: var(--space-md);
  cursor: pointer;
}

.tasks__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.tasks__empty {
  font-size: var(--font-size-sm);
  color: var(--color-gray-400);
  margin-top: var(--space-lg);
}
</style>
