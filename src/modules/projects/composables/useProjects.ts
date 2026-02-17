import { ref } from 'vue'
import * as projectsService from '@/modules/projects/services/projects.service'
import { useActiveProject } from '@/store/activeProject'
import type { Project, ProjectsError } from '@/modules/projects/types'

const projects = ref<Project[]>([])
const loading = ref(false)
const error = ref<ProjectsError | null>(null)

export function useProjects() {
  const { activeProject, setActiveProject, clearActiveProject } = useActiveProject()

  async function fetchProjects(): Promise<void> {
    loading.value = true
    error.value = null

    const result = await projectsService.fetchProjects()

    loading.value = false
    if (result.error) {
      error.value = result.error
      return
    }

    projects.value = result.data ?? []

    const first = projects.value[0]
    if (!activeProject.value && first) {
      setActiveProject(first)
    }
  }

  async function createProject(name: string): Promise<boolean> {
    loading.value = true
    error.value = null

    const result = await projectsService.createProject({ name })

    loading.value = false
    if (result.error) {
      error.value = result.error
      return false
    }

    if (result.data) {
      projects.value.unshift(result.data)
      setActiveProject(result.data)
    }

    return true
  }

  async function updateProject(id: string, name: string): Promise<boolean> {
    loading.value = true
    error.value = null

    const result = await projectsService.updateProject({ id, name })

    loading.value = false
    if (result.error) {
      error.value = result.error
      return false
    }

    if (result.data) {
      const index = projects.value.findIndex((p) => p.id === id)
      if (index !== -1) projects.value[index] = result.data
      if (activeProject.value?.id === id) setActiveProject(result.data)
    }

    return true
  }

  async function deleteProject(id: string): Promise<boolean> {
    loading.value = true
    error.value = null

    const result = await projectsService.deleteProject(id)

    loading.value = false
    if (result.error) {
      error.value = result.error
      return false
    }

    projects.value = projects.value.filter((p) => p.id !== id)

    if (activeProject.value?.id === id) {
      const next = projects.value[0]
      if (next) {
        setActiveProject(next)
      } else {
        clearActiveProject()
      }
    }

    return true
  }

  function selectProject(project: Project): void {
    setActiveProject(project)
  }

  return {
    projects,
    activeProject,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
  }
}
