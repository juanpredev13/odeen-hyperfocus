<template>
  <div class="tasks">
    <header class="tasks__header">
      <div class="tasks__header-left">
        <h1 class="tasks__title">{{ activeProject?.name ?? 'Tasks' }}</h1>
        <span class="tasks__count">{{ tasks.length }} tasks</span>
      </div>
      <button class="tasks__add-btn" :disabled="!activeProject" @click="showForm = true">
        <span class="material-symbols-outlined">add</span>
        New task
      </button>
    </header>

    <p v-if="!activeProject" class="tasks__no-project">
      Select a project first.
    </p>

    <p v-if="error" class="tasks__error" @click="clearError">{{ error.message }}</p>

    <div v-if="activeProject" class="tasks__list">
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
      :project-id="activeProject?.id ?? ''"
      :loading="loading"
      :error="error?.message"
      @submit="handleSubmit"
      @cancel="closeForm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useTasks } from '@/modules/tasks/composables/useTasks'
import { useActiveProject } from '@/store/activeProject'
import TaskCard from '@/modules/tasks/components/TaskCard.vue'
import TaskForm from '@/modules/tasks/components/TaskForm.vue'
import type { Task, TaskStatus, EnergyLevel, ImpactScore } from '@/modules/tasks/types'

const { activeProject } = useActiveProject()
const { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, clearError } =
  useTasks()

const showForm = ref(false)
const editingTask = ref<Task | null>(null)

onMounted(() => {
  if (activeProject.value) fetchTasks(activeProject.value.id)
})

watch(activeProject, (project) => {
  if (project) fetchTasks(project.id)
})

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
  max-width: 720px;
}

.tasks__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.tasks__header-left {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
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

.tasks__add-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.tasks__add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tasks__no-project {
  font-size: var(--font-size-sm);
  color: var(--color-gray-400);
}

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
