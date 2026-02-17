import { ref } from 'vue'
import type { Project } from '@/modules/projects/types'

const activeProject = ref<Project | null>(null)

export function useActiveProject() {
  function setActiveProject(project: Project): void {
    activeProject.value = project
  }

  function clearActiveProject(): void {
    activeProject.value = null
  }

  return {
    activeProject,
    setActiveProject,
    clearActiveProject,
  }
}
