<template>
  <div class="focus">
    <!-- Header -->
    <header class="focus__header">
      <div class="focus__logo">
        <span class="focus__logo-icon">keyboard_command_key</span>
        <span class="focus__logo-text">Focus Mode</span>
      </div>
      <div class="focus__header-right">
        <IntentionsBar collapsed />
        <button class="focus__exit" @click="handleExit">
          <span>Exit</span>
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </header>

    <!-- Main content -->
    <main class="focus__main">
      <div v-if="loading" class="focus__loading">Loading...</div>

      <div v-else-if="!task" class="focus__not-found">
        <p>Task not found</p>
        <RouterLink to="/">Go to Projects</RouterLink>
      </div>

      <div v-else class="focus__content">
        <SessionSetup
          v-if="phase === 'setup'"
          :task-title="task.title"
          :suggested="suggested"
          :checklist="settings.distraction_checklist"
          :busy="busy"
          :error="error?.message"
          @start="handleStart"
          @open-settings="showSettings = true"
        />

        <SessionRunning
          v-else-if="(phase === 'running' || phase === 'timeup') && session"
          :task-title="task.title"
          :seconds-left="secondsLeft"
          :time-up="phase === 'timeup'"
          :refocus-count="session.refocus_count"
          :session-id="session.id"
          :busy="busy"
          @refocus="refocus"
          @extend="extend"
          @stop="stop"
          @complete="handleComplete"
        />

        <SessionSummary
          v-else-if="phase === 'done' && finished"
          :session="finished"
          :captures="capturesInSession"
          :break-activity="breakActivity"
          @again="reset"
          @exit="handleExit"
        />
      </div>
    </main>

    <!-- Footer -->
    <footer class="focus__footer">
      <div class="focus__footer-item">
        <span class="material-symbols-outlined">bolt</span>
        <span>Alt+C to capture</span>
      </div>
      <div class="focus__footer-item">
        <span class="material-symbols-outlined">keyboard_return</span>
        <span>Esc to exit</span>
      </div>
    </footer>

    <SessionSettingsModal v-if="showSettings" @close="showSettings = false" />

    <!-- Ambient glow -->
    <div class="focus__glow focus__glow--left"></div>
    <div class="focus__glow focus__glow--right"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchTask, updateStatus } from '@/modules/tasks/services/tasks.service'
import type { Task } from '@/modules/tasks/types'
import IntentionsBar from '@/modules/assistant/components/IntentionsBar.vue'
import { useAssistantSettings } from '@/modules/assistant/composables/useAssistantSettings'
import SessionSetup from '@/modules/focus/components/SessionSetup.vue'
import SessionRunning from '@/modules/focus/components/SessionRunning.vue'
import SessionSummary from '@/modules/focus/components/SessionSummary.vue'
import SessionSettingsModal from '@/modules/focus/components/SessionSettingsModal.vue'
import { useFocusSession } from '@/modules/focus/composables/useFocusSession'
import { pickBreakActivity } from '@/modules/focus/composables/sessionHelpers'
import { playEndChime } from '@/modules/focus/composables/endSound'

const route = useRoute()
const router = useRouter()

const task = ref<Task | null>(null)
const loading = ref(true)
const showSettings = ref(false)

const taskId = route.params.taskId as string

const { fetchSettings, effectiveSettings } = useAssistantSettings()
const settings = computed(() => effectiveSettings())

const {
  phase,
  session,
  finished,
  capturesInSession,
  secondsLeft,
  error,
  busy,
  init,
  start,
  refocus,
  extend,
  stop,
  reset,
  suggestedMinutes,
} = useFocusSession({
  onTimeUp: () => {
    if (settings.value.end_sound) playEndChime()
  },
})

const suggested = computed(() => suggestedMinutes(settings.value.default_session_minutes))
const breakActivity = computed(() =>
  pickBreakActivity(settings.value.break_activities, finished.value?.refocus_count ?? 0),
)

onMounted(async () => {
  const [result] = await Promise.all([fetchTask(taskId), fetchSettings()])
  if (result.data) {
    task.value = result.data
    await init(taskId)
  }
  loading.value = false
})

async function handleStart(minutes: number): Promise<void> {
  await start(taskId, minutes)
}

/** Leaving Focus Mode ends a running session so its time is logged. */
async function handleExit(): Promise<void> {
  if (phase.value === 'running' || phase.value === 'timeup') await stop()
  router.back()
}

async function handleComplete(): Promise<void> {
  if (!task.value) return
  if (phase.value === 'running' || phase.value === 'timeup') await stop()
  await updateStatus(task.value.id, 'done')
  router.back()
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && !showSettings.value) {
    void handleExit()
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
  background: radial-gradient(circle at center, var(--color-surface) 0%, var(--color-background) 100%);
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

.focus__header-right {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
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
  background-color: color-mix(in srgb, var(--color-primary) 5%, transparent);
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
  background: color-mix(in srgb, var(--color-primary) 3%, transparent);
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
