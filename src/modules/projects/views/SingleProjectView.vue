<template>
  <div v-if="project" class="project">
    <!-- Header -->
    <header class="project__header">
      <div class="project__header-left">
        <div class="project__breadcrumb">
          <RouterLink class="project__breadcrumb-link" to="/">Projects</RouterLink>
          <span class="project__breadcrumb-sep">›</span>
          <span class="project__breadcrumb-current">{{ project.name }}</span>
        </div>
        <h1 class="project__title">{{ project.name }}</h1>
      </div>

      <!-- Progress ring -->
      <div class="project__progress">
        <svg class="project__progress-ring" viewBox="0 0 112 112">
          <circle
            cx="56"
            cy="56"
            r="48"
            fill="none"
            stroke="var(--border-color)"
            stroke-width="1.5"
          />
          <circle
            cx="56"
            cy="56"
            r="48"
            fill="none"
            stroke="var(--color-primary)"
            stroke-width="1.5"
            stroke-linecap="round"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="dashOffset"
            transform="rotate(-90 56 56)"
          />
        </svg>
        <span class="project__progress-pct">{{ progressPct }}%</span>
        <span class="project__progress-label">Complete</span>
      </div>
    </header>

    <p v-if="error" class="project__error">{{ error.message }}</p>

    <!-- Body -->
    <div class="project__body">
      <!-- Left: upcoming tasks -->
      <section class="project__main">
        <div class="project__section-header">
          <h2 class="project__section-title">Upcoming Tasks</h2>
          <button class="project__new-btn" @click="showForm = true">
            <span class="material-symbols-outlined">add</span>
            New Task
          </button>
        </div>

        <div class="project__task-list">
          <div
            v-for="task in upcomingTasks"
            :key="task.id"
            class="project__task-item"
            :class="{ 'project__task-item--doing': task.status === 'doing' }"
          >
            <button
              class="project__task-check"
              :title="`Mark as done`"
              @click="markDone(task.id)"
            ></button>
            <div class="project__task-body">
              <h4 class="project__task-title">{{ task.title }}</h4>
              <p v-if="task.description" class="project__task-desc">{{ task.description }}</p>
            </div>
            <div class="project__task-actions">
              <button class="project__task-btn" title="Edit" @click="startEdit(task)">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button
                class="project__task-btn project__task-btn--danger"
                title="Delete"
                @click="handleDelete(task.id)"
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>

          <p v-if="!loading && upcomingTasks.length === 0" class="project__empty">
            No upcoming tasks. Add your first one.
          </p>
        </div>
      </section>

      <!-- Right: sidebar -->
      <aside class="project__sidebar">
        <!-- Stats -->
        <div class="project__sidebar-section">
          <h3 class="project__sidebar-label">Overview</h3>
          <div class="project__stats">
            <div class="project__stat">
              <p class="project__stat-number">{{ tasks.length }}</p>
              <p class="project__stat-meta">Total Tasks</p>
            </div>
            <div class="project__stat">
              <p class="project__stat-number">{{ doneTasks.length }}</p>
              <p class="project__stat-meta">Done</p>
            </div>
          </div>
        </div>

        <!-- View links -->
        <div class="project__sidebar-section">
          <h3 class="project__sidebar-label">Views</h3>
          <div class="project__views">
            <RouterLink class="project__view-link" :to="`/project/${toSlug(project.name)}/board`">
              <span class="material-symbols-outlined">view_kanban</span>
              Board
            </RouterLink>
            <RouterLink class="project__view-link" :to="`/project/${toSlug(project.name)}/tasks`">
              <span class="material-symbols-outlined">task_alt</span>
              List
            </RouterLink>
          </div>
        </div>

        <!-- Completed tasks -->
        <div v-if="doneTasks.length > 0" class="project__sidebar-section">
          <h3 class="project__sidebar-label">Completed</h3>
          <ul class="project__done-list">
            <li v-for="task in doneTasks" :key="task.id" class="project__done-item">
              <span class="project__done-check">check_circle</span>
              <span class="project__done-title">{{ task.title }}</span>
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <!-- Task form modal -->
    <TaskForm
      v-if="showForm"
      :task="editingTask ?? undefined"
      :project-id="project.id"
      :loading="loading"
      :error="error?.message"
      @submit="handleSubmit"
      @cancel="closeForm"
    />
  </div>

  <div v-else-if="!loading" class="project__not-found">
    <p>Project not found.</p>
    <RouterLink to="/">Back to projects</RouterLink>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProjects } from '@/modules/projects/composables/useProjects'
import { useTasks } from '@/modules/tasks/composables/useTasks'
import TaskForm from '@/modules/tasks/components/TaskForm.vue'
import type { Project } from '@/modules/projects/types'
import type { Task, TaskStatus } from '@/modules/tasks/types'

const route = useRoute()
const { projects, fetchProjects } = useProjects()
const { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, updateStatus } =
  useTasks()

const project = ref<Project | null>(null)
const showForm = ref(false)
const editingTask = ref<Task | null>(null)

const CIRCUMFERENCE = 2 * Math.PI * 48

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

onMounted(async () => {
  if (projects.value.length === 0) await fetchProjects()
  const slug = route.params.slug as string
  project.value = projects.value.find((p) => toSlug(p.name) === slug) ?? null
  if (project.value) await fetchTasks(project.value.id)
})

const upcomingTasks = computed(() => tasks.value.filter((t) => t.status !== 'done'))
const doneTasks = computed(() => tasks.value.filter((t) => t.status === 'done'))

const progressPct = computed(() => {
  if (tasks.value.length === 0) return 0
  return Math.round((doneTasks.value.length / tasks.value.length) * 100)
})

const dashOffset = computed(() => {
  return CIRCUMFERENCE - (progressPct.value / 100) * CIRCUMFERENCE
})

function startEdit(task: Task): void {
  editingTask.value = task
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
  editingTask.value = null
}

async function markDone(id: string): Promise<void> {
  await updateStatus(id, 'done')
}

async function handleDelete(id: string): Promise<void> {
  if (!confirm('Delete this task?')) return
  await deleteTask(id)
}

async function handleSubmit(payload: {
  title: string
  description: string | null
  status: TaskStatus
}): Promise<void> {
  if (editingTask.value) {
    await updateTask({ id: editingTask.value.id, ...payload })
  } else {
    if (!project.value) return
    await createTask({ project_id: project.value.id, ...payload })
  }
  if (!error.value) closeForm()
}
</script>

<style scoped>
.project {
  padding: var(--space-xl);
  max-width: 1100px;
  overflow-y: auto;
  height: 100%;
}

/* ── Header ── */
.project__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 5rem;
  gap: var(--space-lg);
}

.project__header-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-width: 640px;
}

.project__breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-primary) 35%, transparent);
}

.project__breadcrumb-link {
  transition: color 0.15s;
}

.project__breadcrumb-link:hover {
  color: var(--color-primary);
}

.project__breadcrumb-sep {
  opacity: 0.4;
}

.project__title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 0.9;
  color: var(--color-primary);
}

/* ── Progress ring ── */
.project__progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
  position: relative;
}

.project__progress-ring {
  width: 112px;
  height: 112px;
}

.project__progress-pct {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -56%);
  font-size: var(--font-size-body);
  font-weight: 900;
  color: var(--color-primary);
}

.project__progress-label {
  font-size: var(--font-size-xxs);
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-primary) 35%, transparent);
}

/* ── Body ── */
.project__error {
  font-size: var(--font-size-sm);
  color: #dc2626;
  margin-bottom: var(--space-md);
}

.project__body {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 4rem;
}

/* ── Main (tasks) ── */
.project__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2.5rem;
}

.project__section-title {
  font-size: var(--font-size-h3);
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--color-primary);
}

.project__new-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  background: none;
  border: none;
  font-size: var(--font-size-xxs);
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-primary);
  cursor: pointer;
  transition: opacity 0.15s;
  font-family: var(--font-family);
}

.project__new-btn:hover {
  opacity: 0.6;
}

.project__new-btn .material-symbols-outlined {
  font-size: 16px;
}

/* ── Task items ── */
.project__task-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.project__task-item {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background: var(--color-surface);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  transition: border-color 0.3s;
}

.project__task-item:hover {
  border-color: var(--color-primary);
}

.project__task-item--doing {
  border-left: 3px solid var(--color-status-active-dot);
}

.project__task-check {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: 2px solid color-mix(in srgb, var(--color-primary) 15%, transparent);
  border-radius: 4px;
  background: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.project__task-item:hover .project__task-check {
  border-color: var(--color-primary);
}

.project__task-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project__task-title {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.project__task-desc {
  font-size: var(--font-size-sm);
  color: color-mix(in srgb, var(--color-primary) 45%, transparent);
  line-height: var(--leading-relaxed);
}

.project__task-actions {
  display: flex;
  gap: var(--space-xs);
  opacity: 0;
  transition: opacity 0.15s;
}

.project__task-item:hover .project__task-actions {
  opacity: 1;
}

.project__task-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: none;
  border-radius: var(--radius-md);
  color: var(--color-gray-400);
  cursor: pointer;
  transition:
    color 0.15s,
    background-color 0.15s;
}

.project__task-btn:hover {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.project__task-btn--danger:hover {
  color: #dc2626;
  background-color: #fef2f2;
}

.project__task-btn .material-symbols-outlined {
  font-size: 16px;
}

.project__empty {
  font-size: var(--font-size-sm);
  color: var(--color-gray-400);
  padding: 2rem 0;
}

/* ── Sidebar ── */
.project__sidebar {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.project__sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.project__sidebar-label {
  font-size: var(--font-size-xxs);
  font-weight: 900;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.project__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.project__stat-number {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.project__stat-meta {
  font-size: var(--font-size-xxs);
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-primary) 35%, transparent);
}

/* ── View links ── */
.project__views {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.project__view-link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  color: var(--color-gray-500);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  transition:
    background-color 0.15s,
    color 0.15s;
}

.project__view-link:hover {
  background-color: var(--color-background);
  color: var(--color-primary);
}

.project__view-link .material-symbols-outlined {
  font-size: 20px;
}

/* ── Done list ── */
.project__done-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.project__done-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.project__done-check {
  font-family: 'Material Symbols Outlined';
  font-size: 20px;
  color: color-mix(in srgb, var(--color-primary) 20%, transparent);
  font-variation-settings: 'FILL' 1;
  flex-shrink: 0;
}

.project__done-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: color-mix(in srgb, var(--color-primary) 40%, transparent);
  text-decoration: line-through;
}

/* ── Not found ── */
.project__not-found {
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  color: var(--color-gray-500);
}
</style>
