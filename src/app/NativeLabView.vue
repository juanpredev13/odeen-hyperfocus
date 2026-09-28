<template>
  <div class="native-lab">
    <header class="native-lab__header">
      <h1 class="native-lab__title">Native Lab</h1>
      <p class="native-lab__subtitle">
        Try the shell features one by one. Running on <strong>{{ platformLabel }}</strong
        >.
      </p>
    </header>

    <p v-if="platform === 'web'" class="native-lab__notice">
      This is the web build. Native features only work inside the Tauri app (<code
        >pnpm tauri dev</code
      >).
    </p>

    <section v-for="feature in features" :key="feature.id" class="native-lab__card">
      <div class="native-lab__card-head">
        <span class="material-symbols-outlined native-lab__icon" aria-hidden="true">{{
          feature.icon
        }}</span>
        <div>
          <h2 class="native-lab__card-title">{{ feature.title }}</h2>
          <p class="native-lab__card-text">{{ feature.description }}</p>
        </div>
        <span class="native-lab__badge" :class="{ 'native-lab__badge--off': !feature.available }">
          {{ feature.available ? 'Available' : 'Not on this platform' }}
        </span>
      </div>
      <div v-if="feature.available" class="native-lab__actions">
        <button
          v-for="action in feature.actions"
          :key="action.label"
          class="native-lab__btn"
          type="button"
          @click="run(action.label, action.handler)"
        >
          {{ action.label }}
        </button>
      </div>
    </section>

    <section class="native-lab__card">
      <h2 class="native-lab__card-title">Event log</h2>
      <ol v-if="log.length > 0" class="native-lab__log">
        <li v-for="entry in log" :key="entry.id" class="native-lab__log-item">
          <span class="native-lab__log-time">{{ entry.time }}</span> {{ entry.text }}
        </li>
      </ol>
      <p v-else class="native-lab__card-text">Nothing yet. Press a button above.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  CAPTURE_SHORTCUT,
  QUICK_CAPTURE_EVENT,
  ensureTray,
  getNotificationPermission,
  getPlatform,
  isDesktop,
  notify,
  registerCaptureShortcut,
  requestNotificationPermission,
  setAlwaysOnTop,
  setTrayTitle,
  unregisterCaptureShortcut,
} from '@/services/native'
import type { NativePlatform } from '@/services/native'

interface LabAction {
  label: string
  handler: () => Promise<string>
}

interface LabFeature {
  id: string
  icon: string
  title: string
  description: string
  available: boolean
  actions: LabAction[]
}

interface LogEntry {
  id: number
  time: string
  text: string
}

const PLATFORM_LABELS: Record<NativePlatform, string> = {
  linux: 'Linux (desktop)',
  windows: 'Windows (desktop)',
  macos: 'macOS (desktop)',
  ios: 'iOS',
  android: 'Android',
  web: 'Web browser',
}

const platform = ref<NativePlatform>('web')
const log = ref<LogEntry[]>([])
let nextId = 0
let pinned = false
let trayDemo: ReturnType<typeof setInterval> | null = null

const platformLabel = computed(() => PLATFORM_LABELS[platform.value])
const native = computed(() => platform.value !== 'web')
const desktop = computed(() => isDesktop(platform.value))

const features = computed<LabFeature[]>(() => [
  {
    id: 'notifications',
    icon: 'notifications',
    title: 'System notifications',
    description:
      'Used when a hyperfocus session reaches its planned time while ODEEN is in the background. Desktop and mobile.',
    available: native.value,
    actions: [
      {
        label: 'Check permission',
        handler: async () => `Permission: ${await getNotificationPermission()}`,
      },
      {
        label: 'Request permission',
        handler: async () => `Permission: ${await requestNotificationPermission()}`,
      },
      {
        label: 'Send now',
        handler: async () =>
          (await notify('ODEEN', 'Test notification from the Native Lab.'))
            ? 'Notification sent'
            : 'Blocked: no permission',
      },
      {
        label: 'Send in 5 s (switch to another app)',
        handler: async () => {
          setTimeout(() => void notify("Time's up", 'Simulated end of a hyperfocus session.'), 5000)
          return 'Scheduled in 5 s'
        },
      },
    ],
  },
  {
    id: 'shortcut',
    icon: 'keyboard',
    title: 'Global capture shortcut',
    description: `${CAPTURE_SHORTCUT} from any app: brings ODEEN to the front and opens Quick capture. Registered at startup.`,
    available: desktop.value,
    actions: [
      {
        label: 'Register',
        handler: async () =>
          (await registerCaptureShortcut()) ? 'Registered' : 'Could not register',
      },
      {
        label: 'Unregister',
        handler: async () => {
          await unregisterCaptureShortcut()
          return 'Unregistered (restart the app to restore)'
        },
      },
    ],
  },
  {
    id: 'tray',
    icon: 'dock_to_bottom',
    title: 'Tray icon',
    description:
      'Menu with Open and Quick capture. During a session it shows the countdown next to the icon.',
    available: desktop.value,
    actions: [
      {
        label: 'Show tray',
        handler: async () => ((await ensureTray()) ? 'Tray ready' : 'Tray unavailable'),
      },
      { label: 'Simulate 10 s countdown', handler: simulateCountdown },
    ],
  },
  {
    id: 'window',
    icon: 'picture_in_picture',
    title: 'Window control',
    description: 'Keep ODEEN above other windows, e.g. a small timer while you work elsewhere.',
    available: desktop.value,
    actions: [
      {
        label: 'Toggle always on top',
        handler: async () => {
          pinned = !pinned
          await setAlwaysOnTop(pinned)
          return pinned ? 'Always on top: on' : 'Always on top: off'
        },
      },
    ],
  },
])

async function run(label: string, handler: () => Promise<string>): Promise<void> {
  try {
    addLog(`${label} → ${await handler()}`)
  } catch (e) {
    addLog(`${label} → error: ${e instanceof Error ? e.message : String(e)}`)
  }
}

function addLog(text: string): void {
  const time = new Date().toLocaleTimeString()
  log.value = [{ id: nextId++, time, text }, ...log.value].slice(0, 20)
}

async function simulateCountdown(): Promise<string> {
  if (!(await ensureTray())) return 'Tray unavailable'
  if (trayDemo !== null) clearInterval(trayDemo)
  let left = 10
  await setTrayTitle(`0:${String(left).padStart(2, '0')}`)
  trayDemo = setInterval(() => {
    left -= 1
    if (left > 0) {
      void setTrayTitle(`0:${String(left).padStart(2, '0')}`)
      return
    }
    if (trayDemo !== null) clearInterval(trayDemo)
    trayDemo = null
    void setTrayTitle("Time's up")
    setTimeout(() => void setTrayTitle(''), 3000)
  }, 1000)
  return 'Watch the tray icon'
}

function onShortcut(): void {
  addLog(`Global shortcut ${CAPTURE_SHORTCUT} fired`)
}

onMounted(async () => {
  platform.value = await getPlatform()
  window.addEventListener(QUICK_CAPTURE_EVENT, onShortcut)
})

onUnmounted(() => {
  window.removeEventListener(QUICK_CAPTURE_EVENT, onShortcut)
  if (trayDemo !== null) clearInterval(trayDemo)
})
</script>

<style scoped>
.native-lab {
  padding: var(--space-xl);
  max-width: 960px;
  overflow-y: auto;
  height: 100%;
}

.native-lab__header {
  margin-bottom: var(--space-md);
}

.native-lab__title {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-primary);
}

.native-lab__subtitle,
.native-lab__card-text {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.native-lab__notice {
  margin-bottom: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border: var(--border-width) solid var(--color-warning-border);
  border-radius: var(--radius-md);
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
  font-size: var(--font-size-sm);
}

.native-lab__card {
  margin-bottom: var(--space-md);
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.native-lab__card-head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
}

.native-lab__icon {
  color: var(--color-primary);
}

.native-lab__card-title {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.native-lab__badge {
  margin-left: auto;
  flex-shrink: 0;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  background: var(--color-status-done);
  color: var(--color-status-done-text);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.native-lab__badge--off {
  background: var(--color-status-neutral);
  color: var(--color-gray-500);
}

.native-lab__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.native-lab__btn {
  padding: var(--space-sm) var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-primary);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.native-lab__btn:hover {
  border-color: var(--color-primary);
}

.native-lab__log {
  margin-top: var(--space-sm);
  list-style: none;
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

.native-lab__log-item + .native-lab__log-item {
  margin-top: var(--space-xs);
}

.native-lab__log-time {
  color: var(--color-gray-500);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .native-lab {
    padding: var(--space-md);
  }

  .native-lab__card-head {
    flex-wrap: wrap;
  }

  .native-lab__badge {
    margin-left: 0;
  }
}
</style>
