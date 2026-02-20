<template>
  <div class="kanban-wrap">
    <template v-if="loading">
      <div class="kanban-pick">
        <p class="kanban-pick__sub">Loading...</p>
      </div>
    </template>

    <template v-else-if="!selectedProject">
      <div class="kanban-pick">
        <h1 class="kanban-pick__title">Project not found</h1>
        <p class="kanban-pick__sub">
          Select a project from the <RouterLink to="/">dashboard</RouterLink>.
        </p>
      </div>
    </template>

    <template v-else>
      <header class="kanban-header">
        <div class="kanban-header__left">
          <RouterLink class="kanban-header__back" :to="`/project/${toSlug(selectedProject.name)}`">
            <span class="material-symbols-outlined">arrow_back</span>
          </RouterLink>
          <div>
            <h2 class="kanban-header__title">{{ selectedProject.name }}</h2>
            <p class="kanban-header__meta">{{ totalCount }} tasks · {{ doneCount }} done</p>
          </div>
        </div>
        <button class="kanban-header__new-btn" @click="openForm('todo')">
          <span class="material-symbols-outlined">add</span>
          New Task
        </button>
      </header>

      <div class="kanban-board">
        <KanbanColumn
          v-for="col in COLUMNS"
          :key="col.status"
          :status="col.status"
          :label="col.label"
          :tasks="tasksByStatus[col.status]"
          :is-dragging-active="draggingTaskId !== null"
          @drop="handleDrop"
          @edit="startEdit"
          @delete="handleDelete"
          @dragstart="draggingTaskId = $event"
          @dragend="draggingTaskId = null"
          @add-task="openForm(col.status)"
          @focus="goToFocus"
        />
      </div>

      <!-- WIP overload banner -->
      <Transition name="fade">
        <div v-if="wipOverload" class="kanban-wip-banner">
          Cognitive overload: move a task to Done before adding more to Doing.
        </div>
      </Transition>

      <!-- Task form -->
      <TaskForm
        v-if="showForm"
        :task="editingTask ?? undefined"
        :project-id="selectedProject.id"
        :loading="saving"
        :error="formError"
        @submit="handleSubmit"
        @cancel="closeForm"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjects } from '@/modules/projects/composables/useProjects'
import {
  fetchTasks,
  updateTask,
  deleteTask as deleteTaskService,
  createTask,
} from '@/modules/tasks/services/tasks.service'
import KanbanColumn from '@/modules/kanban/components/KanbanColumn.vue'
import TaskForm from '@/modules/tasks/components/TaskForm.vue'
import type { Project } from '@/modules/projects/types'
import type { Task, TaskStatus } from '@/modules/tasks/types'

const WIP_LIMIT = 3

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To Do' },
  { status: 'doing', label: 'Doing' },
  { status: 'done', label: 'Done' },
]

const route = useRoute()
const router = useRouter()
const { projects, fetchProjects } = useProjects()

const selectedProject = ref<Project | null>(null)
const tasks = ref<Task[]>([])
const loading = ref(false)
const saving = ref(false)
const formError = ref<string | undefined>(undefined)

const showForm = ref(false)
const editingTask = ref<Task | null>(null)
const newTaskStatus = ref<TaskStatus>('todo')
const draggingTaskId = ref<string | null>(null)

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

onMounted(async () => {
  loading.value = true
  if (projects.value.length === 0) await fetchProjects()
  await loadProject()
  loading.value = false
})

watch(() => route.params.slug, loadProject)

async function loadProject(): Promise<void> {
  const slug = route.params.slug as string
  const project = projects.value.find((p) => toSlug(p.name) === slug)
  if (!project) return
  selectedProject.value = project
  const result = await fetchTasks(project.id)
  if (result.data) tasks.value = result.data
}

const tasksByStatus = computed<Record<TaskStatus, Task[]>>(() => ({
  todo: tasks.value.filter((t) => t.status === 'todo'),
  doing: tasks.value.filter((t) => t.status === 'doing'),
  done: tasks.value.filter((t) => t.status === 'done'),
}))

const totalCount = computed(() => tasks.value.length)
const doneCount = computed(() => tasksByStatus.value.done.length)
const wipOverload = computed(() => tasksByStatus.value.doing.length >= WIP_LIMIT)

async function handleDrop(taskId: string, newStatus: TaskStatus): Promise<void> {
  if (newStatus === 'doing' && tasksByStatus.value.doing.length >= WIP_LIMIT) return

  const result = await updateTask({ id: taskId, status: newStatus })
  if (result.data) {
    const idx = tasks.value.findIndex((t) => t.id === taskId)
    if (idx !== -1) tasks.value[idx] = result.data
  }
}

function openForm(status: TaskStatus): void {
  newTaskStatus.value = status
  editingTask.value = null
  showForm.value = true
}

function startEdit(task: Task): void {
  editingTask.value = task
  showForm.value = true
}

function goToFocus(task: Task): void {
  router.push(`/focus/${task.id}`)
}

function closeForm(): void {
  showForm.value = false
  editingTask.value = null
  formError.value = undefined
}

async function handleSubmit(payload: {
  title: string
  description: string | null
  status: TaskStatus
}): Promise<void> {
  if (!selectedProject.value) return
  saving.value = true
  formError.value = undefined

  if (editingTask.value) {
    const taskId = editingTask.value.id
    const result = await updateTask({ id: taskId, ...payload })
    if (result.error) {
      formError.value = result.error.message
      saving.value = false
      return
    }
    if (result.data) {
      const idx = tasks.value.findIndex((t) => t.id === taskId)
      if (idx !== -1) tasks.value[idx] = result.data
    }
  } else {
    if (payload.status === 'doing' && tasksByStatus.value.doing.length >= WIP_LIMIT) {
      formError.value = 'WIP limit reached: max 3 tasks in Doing.'
      saving.value = false
      return
    }
    const result = await createTask({ project_id: selectedProject.value.id, ...payload })
    if (result.error) {
      formError.value = result.error.message
      saving.value = false
      return
    }
    if (result.data) tasks.value.push(result.data)
  }

  saving.value = false
  closeForm()
}

async function handleDelete(id: string): Promise<void> {
  if (!confirm('Delete this task?')) return
  await deleteTaskService(id)
  tasks.value = tasks.value.filter((t) => t.id !== id)
}
</script>

<style scoped>
/* ── Wrapper: fills main content area ── */
.kanban-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Project picker ── */
.kanban-pick {
  padding: var(--space-xl);
  max-width: 860px;
}

.kanban-pick__title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 0.9;
  color: var(--color-primary);
  margin-bottom: var(--space-md);
}

.kanban-pick__sub {
  font-size: var(--font-size-body);
  color: var(--color-gray-500);
  margin-bottom: var(--space-lg);
}

.kanban-pick__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-md);
}

.kanban-pick__card {
  aspect-ratio: 1;
  padding: var(--space-lg);
  border: var(--border-width) solid var(--color-primary);
  border-radius: var(--radius-md);
  background: transparent;
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-family);
  transition:
    background-color 0.3s,
    color 0.3s;
}

.kanban-pick__card:hover {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.kanban-pick__empty {
  font-size: var(--font-size-sm);
  color: var(--color-gray-400);
  margin-top: var(--space-lg);
}

.kanban-pick__empty a {
  color: var(--color-primary);
  text-decoration: underline;
}

/* ── Board header ── */
.kanban-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: var(--border-width) solid var(--border-color);
  background: var(--color-surface);
  flex-shrink: 0;
}

.kanban-header__left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.kanban-header__back {
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
  transition:
    color 0.15s,
    background-color 0.15s;
}

.kanban-header__back:hover {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.kanban-header__back .material-symbols-outlined {
  font-size: 20px;
}

.kanban-header__title {
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-primary);
}

.kanban-header__meta {
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
  font-family: monospace;
  margin-top: 2px;
}

.kanban-header__new-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: opacity 0.15s;
  font-family: var(--font-family);
}

.kanban-header__new-btn:hover {
  opacity: 0.85;
}

.kanban-header__new-btn .material-symbols-outlined {
  font-size: 18px;
}

/* ── Board ── */
.kanban-board {
  flex: 1;
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  overflow-x: auto;
  overflow-y: hidden;
  min-height: 0;
}

/* ── WIP overload banner ── */
.kanban-wip-banner {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #dc2626;
  color: white;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-full);
  box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4);
  z-index: 200;
  white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
