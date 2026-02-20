<template>
  <div class="focus">
    <!-- Header -->
    <header class="focus__header">
      <div class="focus__logo">
        <span class="focus__logo-icon">keyboard_command_key</span>
        <span class="focus__logo-text">Focus Mode</span>
      </div>
      <button class="focus__exit" @click="handleExit">
        <span>Exit</span>
        <span class="material-symbols-outlined">close</span>
      </button>
    </header>

    <!-- Main content -->
    <main class="focus__main">
      <div v-if="loading" class="focus__loading">Loading...</div>

      <div v-else-if="!task" class="focus__not-found">
        <p>Task not found</p>
        <RouterLink to="/">Go to Projects</RouterLink>
      </div>

      <template v-else>
        <div class="focus__content">
          <!-- Status indicator -->
          <div class="focus__status">
            <span class="focus__status-dot"></span>
            <span class="focus__status-text">Focusing...</span>
          </div>

          <!-- Task -->
          <div class="focus__task">
            <h1 class="focus__task-title">{{ task.title }}</h1>
            <p v-if="task.description" class="focus__task-desc">{{ task.description }}</p>
          </div>

          <!-- Actions -->
          <div class="focus__actions">
            <button class="focus__complete" @click="handleComplete">
              <span class="material-symbols-outlined">check_circle</span>
              <span>Mark as Completed</span>
            </button>
            <div class="focus__shortcut">
              <kbd>ESC</kbd>
              <span>to exit</span>
            </div>
          </div>
        </div>
      </template>
    </main>

    <!-- Footer -->
    <footer class="focus__footer">
      <div class="focus__footer-item">
        <span class="material-symbols-outlined">music_note</span>
        <span>Deep Focus</span>
      </div>
      <div class="focus__footer-item">
        <span class="material-symbols-outlined">notifications_off</span>
        <span>Do Not Disturb</span>
      </div>
    </footer>

    <!-- Ambient glow -->
    <div class="focus__glow focus__glow--left"></div>
    <div class="focus__glow focus__glow--right"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchTask, updateStatus } from '@/modules/tasks/services/tasks.service'
import type { Task } from '@/modules/tasks/types'

const route = useRoute()
const router = useRouter()

const task = ref<Task | null>(null)
const loading = ref(true)

const taskId = route.params.taskId as string

onMounted(async () => {
  const result = await fetchTask(taskId)
  if (result.data) {
    task.value = result.data
  }
  loading.value = false
})

function handleExit(): void {
  router.back()
}

async function handleComplete(): Promise<void> {
  if (!task.value) return
  await updateStatus(task.value.id, 'done')
  router.back()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleKeydown(e: any): void {
  if (e.key === 'Escape') {
    handleExit()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.focus {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at center, #fafafa 0%, #f0f0f0 100%);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

/* Header */
.focus__header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  opacity: 0;
  transition: opacity 0.5s;
}

.focus:hover .focus__header {
  opacity: 1;
}

.focus__logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.focus__logo-icon {
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  color: var(--color-gray-400);
}

.focus__logo-text {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-gray-400);
}

.focus__exit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.15s;
}

.focus__exit:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.focus__exit span:first-child {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.focus__exit .material-symbols-outlined {
  font-size: 20px;
  color: var(--color-gray-500);
}

/* Main */
.focus__main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.focus__loading,
.focus__not-found {
  text-align: center;
  color: var(--color-gray-400);
}

.focus__not-found a {
  color: var(--color-primary);
  text-decoration: underline;
}

.focus__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 720px;
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Status */
.focus__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.focus__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.focus__status-text {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--color-gray-400);
}

/* Task */
.focus__task {
  text-align: center;
  margin-bottom: 3rem;
}

.focus__task-title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--color-primary);
  margin-bottom: 1rem;
}

.focus__task-desc {
  font-size: var(--font-size-lg);
  font-weight: 400;
  color: var(--color-gray-400);
  max-width: 480px;
  line-height: 1.6;
}

/* Actions */
.focus__actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.focus__complete {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: var(--color-primary);
  color: var(--color-surface);
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-body);
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.15s,
    opacity 0.15s;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.focus__complete:hover {
  transform: scale(1.02);
  opacity: 0.9;
}

.focus__complete:active {
  transform: scale(0.98);
}

.focus__complete .material-symbols-outlined {
  font-size: 22px;
  transition: transform 0.2s;
}

.focus__complete:hover .material-symbols-outlined {
  transform: rotate(12deg);
}

.focus__shortcut {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-gray-300);
  padding: 1rem 0;
}

.focus__shortcut kbd {
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font-family);
}

.focus__shortcut span {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* Footer */
.focus__footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 2rem;
  display: flex;
  justify-content: center;
  gap: 3rem;
  opacity: 0;
  transition: opacity 0.7s;
}

.focus:hover .focus__footer {
  opacity: 1;
}

.focus__footer-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-gray-300);
}

.focus__footer-item .material-symbols-outlined {
  font-size: 16px;
}

/* Glow effects */
.focus__glow {
  position: absolute;
  top: 50%;
  width: 200px;
  height: 300px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.focus__glow--left {
  left: 0;
  transform: translateY(-50%);
}

.focus__glow--right {
  right: 0;
  bottom: 0;
  top: auto;
  transform: none;
}
</style>
