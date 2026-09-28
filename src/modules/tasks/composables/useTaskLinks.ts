import { ref, shallowRef, triggerRef } from 'vue'
import * as taskLinksService from '@/modules/tasks/services/taskLinks.service'
import { parseTaskLink } from '@/modules/tasks/composables/taskLinkHelpers'
import { useTaskLinkCounts } from '@/modules/tasks/composables/useTaskLinkCounts'
import type { GithubIssueInfo, TaskLink, TasksError } from '@/modules/tasks/types'

export type GithubIssueStatus =
  | { state: 'loading' }
  | { state: 'ready'; info: GithubIssueInfo }
  | { state: 'error'; message: string }

// Shared across modals so reopening a task does not refetch from GitHub
// (unauthenticated API is limited to 60 requests per hour).
const issueCache = shallowRef(new Map<string, GithubIssueStatus>())

async function loadIssue(url: string): Promise<void> {
  if (issueCache.value.has(url)) return
  issueCache.value.set(url, { state: 'loading' })
  triggerRef(issueCache)

  const result = await taskLinksService.fetchGithubIssue(url)
  issueCache.value.set(
    url,
    result.data
      ? { state: 'ready', info: result.data }
      : { state: 'error', message: result.error?.message ?? 'Unknown error' },
  )
  triggerRef(issueCache)
}

export function useTaskLinks(taskId: string) {
  const links = ref<TaskLink[]>([])
  const loading = ref(false)
  const error = ref<TasksError | null>(null)
  const { adjustCount } = useTaskLinkCounts()

  function loadIssues(): void {
    for (const link of links.value) {
      if (link.kind === 'github_issue') void loadIssue(link.url)
    }
  }

  async function fetchLinks(): Promise<void> {
    loading.value = true
    error.value = null

    const result = await taskLinksService.fetchTaskLinks(taskId)

    loading.value = false
    if (result.error) {
      error.value = result.error
      return
    }

    links.value = result.data ?? []
    loadIssues()
  }

  async function addLink(input: string): Promise<boolean> {
    const parsed = parseTaskLink(input)
    if (!parsed) {
      error.value = { message: 'Paste a GitHub issue (owner/repo#123 or URL) or an Obsidian note.' }
      return false
    }

    loading.value = true
    error.value = null

    const result = await taskLinksService.createTaskLink({ task_id: taskId, ...parsed })

    loading.value = false
    if (result.error) {
      error.value = result.error
      return false
    }

    if (result.data) {
      links.value.push(result.data)
      adjustCount(taskId, result.data.kind, 1)
      loadIssues()
    }

    return true
  }

  async function removeLink(id: string): Promise<boolean> {
    error.value = null

    const result = await taskLinksService.deleteTaskLink(id)

    if (result.error) {
      error.value = result.error
      return false
    }

    const removed = links.value.find((l) => l.id === id)
    if (removed) adjustCount(taskId, removed.kind, -1)
    links.value = links.value.filter((l) => l.id !== id)

    return true
  }

  function issueStatus(url: string): GithubIssueStatus | undefined {
    return issueCache.value.get(url)
  }

  return { links, loading, error, fetchLinks, addLink, removeLink, issueStatus }
}
