import { ref, computed } from 'vue'
import * as tasksService from '@/modules/tasks/services/tasks.service'
import type { Task, TaskStatus, CreateTaskPayload, UpdateTaskPayload, TasksError } from '@/modules/tasks/types'

const tasks = ref<Task[]>([])
const loading = ref(false)
const error = ref<TasksError | null>(null)

export function useTasks() {
  const doingCount = computed(() => tasks.value.filter((t) => t.status === 'doing').length)

  async function fetchTasks(projectId: string): Promise<void> {
    loading.value = true
    error.value = null

    const result = await tasksService.fetchTasks(projectId)

    loading.value = false
    if (result.error) {
      error.value = result.error
      return
    }

    tasks.value = result.data ?? []
  }

  async function createTask(payload: CreateTaskPayload): Promise<boolean> {
    if (payload.status === 'doing' && doingCount.value >= 3) {
      error.value = { message: 'WIP limit reached: max 3 tasks in Doing.' }
      return false
    }

    loading.value = true
    error.value = null

    const result = await tasksService.createTask(payload)

    loading.value = false
    if (result.error) {
      error.value = result.error
      return false
    }

    if (result.data) tasks.value.push(result.data)

    return true
  }

  async function updateTask(payload: UpdateTaskPayload): Promise<boolean> {
    if (
      payload.status === 'doing' &&
      doingCount.value >= 3 &&
      tasks.value.find((t) => t.id === payload.id)?.status !== 'doing'
    ) {
      error.value = { message: 'WIP limit reached: max 3 tasks in Doing.' }
      return false
    }

    loading.value = true
    error.value = null

    const result = await tasksService.updateTask(payload)

    loading.value = false
    if (result.error) {
      error.value = result.error
      return false
    }

    if (result.data) {
      const index = tasks.value.findIndex((t) => t.id === payload.id)
      if (index !== -1) tasks.value[index] = result.data
    }

    return true
  }

  async function deleteTask(id: string): Promise<boolean> {
    loading.value = true
    error.value = null

    const result = await tasksService.deleteTask(id)

    loading.value = false
    if (result.error) {
      error.value = result.error
      return false
    }

    tasks.value = tasks.value.filter((t) => t.id !== id)

    return true
  }

  async function updateStatus(id: string, status: TaskStatus): Promise<boolean> {
    return updateTask({ id, status })
  }

  async function updatePosition(id: string, x: number, y: number): Promise<boolean> {
    const result = await tasksService.updatePosition(id, x, y)

    if (result.error) {
      error.value = result.error
      return false
    }

    if (result.data) {
      const index = tasks.value.findIndex((t) => t.id === id)
      if (index !== -1) tasks.value[index] = result.data
    }

    return true
  }

  function clearError(): void {
    error.value = null
  }

  return {
    tasks,
    loading,
    error,
    doingCount,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateStatus,
    updatePosition,
    clearError,
  }
}
