import { shallowRef, triggerRef } from 'vue'
import * as taskLinksService from '@/modules/tasks/services/taskLinks.service'
import type { TaskLinkKind } from '@/modules/tasks/types'

export type TaskLinkCounts = Record<TaskLinkKind, number>

const EMPTY: TaskLinkCounts = { github_issue: 0, obsidian_note: 0 }

const counts = shallowRef(new Map<string, TaskLinkCounts>())
const pending = new Set<string>()
let flushQueued = false

// Cards request their counts one by one while rendering; batch every
// request from the same tick into a single query.
async function flush(): Promise<void> {
  flushQueued = false
  const taskIds = [...pending]
  pending.clear()
  if (!taskIds.length) return

  const result = await taskLinksService.fetchLinkKinds(taskIds)
  if (result.error) {
    console.error('Failed to load task link counts:', result.error.message)
    return
  }

  for (const id of taskIds) counts.value.set(id, { ...EMPTY })
  for (const link of result.data ?? []) {
    const entry = counts.value.get(link.task_id)
    if (entry) entry[link.kind] += 1
  }
  triggerRef(counts)
}

export function useTaskLinkCounts() {
  function requestCounts(taskId: string): void {
    if (counts.value.has(taskId) || pending.has(taskId)) return
    pending.add(taskId)
    if (!flushQueued) {
      flushQueued = true
      queueMicrotask(() => void flush())
    }
  }

  function countsFor(taskId: string): TaskLinkCounts {
    return counts.value.get(taskId) ?? EMPTY
  }

  /** Keeps cards in sync after a link is added or removed in the modal. */
  function adjustCount(taskId: string, kind: TaskLinkKind, delta: number): void {
    const current = counts.value.get(taskId) ?? { ...EMPTY }
    counts.value.set(taskId, { ...current, [kind]: Math.max(0, current[kind] + delta) })
    triggerRef(counts)
  }

  return { requestCounts, countsFor, adjustCount }
}
