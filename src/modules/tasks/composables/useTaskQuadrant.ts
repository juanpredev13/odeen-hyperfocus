import type { Task, TaskQuadrant } from '@/modules/tasks/types'

/** A task counts as productive from this impact score upward. */
export const PRODUCTIVE_IMPACT_THRESHOLD = 3

export interface QuadrantInfo {
  id: TaskQuadrant
  label: string
  description: string
}

/** Display order: productive quadrants first. */
export const QUADRANTS: readonly QuadrantInfo[] = [
  { id: 'purposeful', label: 'Purposeful', description: 'Productive and enjoyable' },
  { id: 'necessary', label: 'Necessary', description: 'Productive, not enjoyable' },
  { id: 'distracting', label: 'Distracting', description: 'Enjoyable, not productive' },
  { id: 'unnecessary', label: 'Unnecessary', description: 'Neither productive nor enjoyable' },
]

export function isProductive(task: Pick<Task, 'impact_score'>): boolean {
  return task.impact_score >= PRODUCTIVE_IMPACT_THRESHOLD
}

export function getTaskQuadrant(task: Pick<Task, 'impact_score' | 'is_attractive'>): TaskQuadrant {
  if (isProductive(task)) return task.is_attractive ? 'purposeful' : 'necessary'
  return task.is_attractive ? 'distracting' : 'unnecessary'
}

export function getQuadrantInfo(quadrant: TaskQuadrant): QuadrantInfo {
  const info = QUADRANTS.find((q) => q.id === quadrant)
  if (!info) throw new Error(`Unknown quadrant: ${quadrant}`)
  return info
}

export function filterByQuadrant<T extends Pick<Task, 'impact_score' | 'is_attractive'>>(
  tasks: readonly T[],
  quadrant: TaskQuadrant | null,
): T[] {
  if (quadrant === null) return [...tasks]
  return tasks.filter((t) => getTaskQuadrant(t) === quadrant)
}
