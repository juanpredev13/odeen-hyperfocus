<template>
  <div class="session-running" :class="{ 'session-running--timeup': timeUp }">
    <div class="session-running__status">
      <span class="session-running__dot" aria-hidden="true" />
      <span class="session-running__status-text">{{ timeUp ? "Time's up" : 'Focusing' }}</span>
    </div>

    <p class="session-running__clock" role="timer" :aria-label="`${clock} remaining`">{{ clock }}</p>

    <h1 class="session-running__task" :class="{ 'session-running__task--pulse': pulsing }">
      {{ taskTitle }}
    </h1>
    <p class="session-running__reminder" aria-live="polite">{{ pulsing ? `Back to: ${taskTitle}` : '' }}</p>

    <div v-if="timeUp" class="session-running__timeup">
      <p class="session-running__timeup-text">On a roll? Keep going, or stop and take a break.</p>
      <div class="session-running__timeup-actions">
        <button class="session-running__primary" type="button" :disabled="busy" @click="emit('extend')">
          Keep going +{{ extendMinutes }} min
        </button>
        <button class="session-running__secondary" type="button" :disabled="busy" @click="emit('stop')">
          Stop
        </button>
      </div>
    </div>

    <template v-else>
      <button class="session-running__wander" type="button" @click="onRefocus">
        <span class="material-symbols-outlined" aria-hidden="true">u_turn_left</span>
        My mind wandered
        <span class="session-running__count" :aria-label="`${refocusCount} refocuses`">{{ refocusCount }}</span>
      </button>

      <form class="session-running__capture" @submit.prevent="submitCapture">
        <input
          v-model="note"
          class="session-running__capture-input"
          type="text"
          :maxlength="MAX_CAPTURE_LENGTH"
          placeholder="Park a stray thought… (idea: / worry: / waiting:)"
          aria-label="Capture a thought without leaving the session"
          @keydown.esc.stop="note = ''"
        />
        <span class="session-running__captured" role="status" aria-live="polite">{{ captured }}</span>
      </form>

      <div class="session-running__actions">
        <button class="session-running__complete" type="button" :disabled="busy" @click="emit('complete')">
          <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
          Mark as Completed
        </button>
        <button class="session-running__secondary" type="button" :disabled="busy" @click="emit('stop')">
          End session
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { formatClock, EXTEND_MINUTES } from '@/modules/focus/composables/sessionHelpers'
import { useCaptures } from '@/modules/assistant/composables/useCaptures'
import {
  MAX_CAPTURE_LENGTH,
  getKindInfo,
  isValidCaptureText,
} from '@/modules/assistant/composables/captureHelpers'

const props = defineProps<{
  taskTitle: string
  secondsLeft: number
  timeUp: boolean
  refocusCount: number
  sessionId: string
  busy: boolean
}>()

const emit = defineEmits<{
  refocus: []
  extend: []
  stop: []
  complete: []
}>()

const extendMinutes = EXTEND_MINUTES
const { capture } = useCaptures()

const note = ref('')
const captured = ref('')
const pulsing = ref(false)
let pulseTimer: ReturnType<typeof setTimeout> | null = null

const clock = computed(() => formatClock(props.secondsLeft))

function onRefocus(): void {
  emit('refocus')
  pulsing.value = true
  if (pulseTimer !== null) clearTimeout(pulseTimer)
  pulseTimer = setTimeout(() => {
    pulsing.value = false
  }, 2500)
}

async function submitCapture(): Promise<void> {
  if (!isValidCaptureText(note.value)) return
  const saved = await capture(note.value, undefined, props.sessionId)
  if (!saved) return
  note.value = ''
  captured.value = `Parked as ${getKindInfo(saved.kind).label.toLowerCase()}. Back to focus.`
}

onUnmounted(() => {
  if (pulseTimer !== null) clearTimeout(pulseTimer)
})
</script>

<style scoped>
.session-running {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  width: min(640px, 100%);
  text-align: center;
}

.session-running__status {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.session-running__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  animation: session-pulse 2s infinite;
}

.session-running--timeup .session-running__dot {
  background: var(--color-status-done-dot);
  animation: none;
}

@keyframes session-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.session-running__status-text {
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--color-gray-400);
}

.session-running__clock {
  font-size: clamp(3.5rem, 12vw, 7rem);
  font-weight: var(--font-weight-bold);
  font-variant-numeric: tabular-nums;
  letter-spacing: var(--tracking-tight);
  line-height: 1;
  color: var(--color-primary);
}

.session-running__task {
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-600);
  transition:
    color 0.3s,
    transform 0.3s;
}

.session-running__task--pulse {
  color: var(--color-primary);
  transform: scale(1.06);
}

.session-running__reminder {
  min-height: 1.25rem;
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.session-running__wander {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  cursor: pointer;
  transition: border-color 0.15s;
}

.session-running__wander:hover {
  border-color: var(--color-primary);
}

.session-running__wander .material-symbols-outlined {
  font-size: 18px;
}

.session-running__count {
  min-width: 20px;
  padding: 0 var(--space-xs);
  border-radius: var(--radius-full);
  background: var(--color-background);
  font-family: monospace;
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

.session-running__capture {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  width: min(440px, 100%);
}

.session-running__capture-input {
  width: 100%;
  border: none;
  border-bottom: var(--border-width) solid var(--border-color);
  padding: var(--space-sm) 0;
  background: transparent;
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  text-align: center;
  outline: none;
}

.session-running__capture-input:focus {
  border-bottom-color: var(--color-primary);
}

.session-running__captured {
  min-height: 1rem;
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}

.session-running__actions,
.session-running__timeup-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-sm);
}

.session-running__timeup {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.session-running__timeup-text {
  font-size: var(--font-size-body);
  color: var(--color-gray-500);
}

.session-running__complete,
.session-running__primary {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0.75rem 1.75rem;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.session-running__secondary {
  padding: 0.75rem 1.5rem;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  cursor: pointer;
}

.session-running__complete:disabled,
.session-running__primary:disabled,
.session-running__secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
