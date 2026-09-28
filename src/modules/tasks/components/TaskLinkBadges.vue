<template>
  <span
    v-if="badges.length"
    class="task-link-badges"
    :class="{ 'task-link-badges--on-pod': onPod }"
  >
    <span
      v-for="badge in badges"
      :key="badge.kind"
      class="task-link-badges__item"
      :title="badge.title"
    >
      <TaskLinkIcon :kind="badge.kind" :on-pod="onPod" />
      <span v-if="badge.count > 1" class="task-link-badges__count">{{ badge.count }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import TaskLinkIcon from '@/modules/tasks/components/TaskLinkIcon.vue'
import { useTaskLinkCounts } from '@/modules/tasks/composables/useTaskLinkCounts'
import type { TaskLinkKind } from '@/modules/tasks/types'

const props = defineProps<{
  taskId: string
  onPod?: boolean
}>()

const { requestCounts, countsFor } = useTaskLinkCounts()

onMounted(() => requestCounts(props.taskId))

const NOUNS: Record<TaskLinkKind, [string, string]> = {
  github_issue: ['GitHub issue', 'GitHub issues'],
  obsidian_note: ['Obsidian note', 'Obsidian notes'],
}

const badges = computed(() => {
  const counts = countsFor(props.taskId)
  return (Object.keys(NOUNS) as TaskLinkKind[])
    .filter((kind) => counts[kind] > 0)
    .map((kind) => ({
      kind,
      count: counts[kind],
      title: `${counts[kind]} ${NOUNS[kind][counts[kind] === 1 ? 0 : 1]}`,
    }))
})
</script>

<style scoped>
.task-link-badges {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.task-link-badges__item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.task-link-badges__count {
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-500);
}

.task-link-badges--on-pod .task-link-badges__count {
  color: var(--color-on-pod-muted);
}
</style>
