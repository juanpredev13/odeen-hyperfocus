<template>
  <div class="quick-capture">
    <p class="quick-capture__status" role="status" aria-live="polite">{{ status }}</p>

    <form
      v-if="open"
      id="quick-capture-panel"
      class="quick-capture__panel"
      aria-label="Quick capture"
      @submit.prevent="save"
    >
      <div class="quick-capture__row">
        <input
          ref="inputRef"
          v-model="text"
          class="quick-capture__input"
          type="text"
          :maxlength="MAX_CAPTURE_LENGTH"
          placeholder="Capture anything… (tarea / propósito / idea: …)"
          aria-label="Capture text"
          @keydown.esc.stop.prevent="close"
        />
        <button
          v-if="voice.available.value"
          class="quick-capture__mic"
          :class="{ 'quick-capture__mic--recording': voice.phase.value === 'recording' }"
          type="button"
          :disabled="voice.phase.value === 'downloading' || voice.phase.value === 'transcribing'"
          :aria-pressed="voice.phase.value === 'recording'"
          :title="voice.phase.value === 'recording' ? 'Stop and transcribe' : 'Speak'"
          @click="voice.toggle()"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{ micIcon }}</span>
        </button>
      </div>
      <p v-if="voiceHint" class="quick-capture__voice-hint" role="status">{{ voiceHint }}</p>

      <div v-if="command.type === 'task'" class="quick-capture__target">
        <span class="material-symbols-outlined" aria-hidden="true">task_alt</span>
        New task in
        <select v-model="projectId" class="quick-capture__select" aria-label="Project">
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <span v-if="command.energy" class="quick-capture__meta">energy {{ command.energy }}</span>
        <span v-if="command.impact" class="quick-capture__meta">impact {{ command.impact }}</span>
      </div>
      <div v-else-if="command.type === 'intention'" class="quick-capture__target">
        <span class="material-symbols-outlined" aria-hidden="true">flag</span>
        Today's intention
      </div>

      <div v-if="command.type === 'capture'" class="quick-capture__kinds" role="radiogroup" aria-label="Kind">
        <button
          v-for="k in CAPTURE_KINDS"
          :key="k.id"
          class="quick-capture__kind"
          :class="{ 'quick-capture__kind--active': preview.kind === k.id }"
          type="button"
          role="radio"
          :aria-checked="preview.kind === k.id"
          @click="pickKind(k.id)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{ k.icon }}</span>
          {{ k.label }}
        </button>
      </div>

      <div class="quick-capture__footer">
        <span class="quick-capture__hint"><kbd>↵</kbd> save · <kbd>Esc</kbd> close</span>
        <button class="quick-capture__save" type="submit" :disabled="saving || !canSave">{{ saveLabel }}</button>
      </div>
      <p v-if="errorMessage" class="quick-capture__error" role="alert">{{ errorMessage }}</p>
    </form>

    <button
      class="quick-capture__fab"
      :class="{ 'quick-capture__fab--open': open }"
      type="button"
      :aria-expanded="open"
      aria-controls="quick-capture-panel"
      aria-keyshortcuts="Alt+C"
      title="Quick capture (Alt+C)"
      @click="open ? close() : show()"
    >
      <span class="material-symbols-outlined" aria-hidden="true">{{ open ? 'close' : 'bolt' }}</span>
      <span class="quick-capture__fab-label">Capture</span>
      <kbd class="quick-capture__fab-kbd">Alt C</kbd>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCaptures } from '@/modules/assistant/composables/useCaptures'
import {
  CAPTURE_KINDS,
  DEFAULT_CAPTURE_KIND,
  MAX_CAPTURE_LENGTH,
  getKindInfo,
  isValidCaptureText,
  parseQuickCapture,
} from '@/modules/assistant/composables/captureHelpers'
import { matchProject, parseVoiceCommand } from '@/modules/assistant/composables/voiceCommand'
import { useIntentions } from '@/modules/assistant/composables/useIntentions'
import { useVoiceInput } from '@/modules/assistant/composables/useVoiceInput'
import { useActiveSessionId } from '@/modules/focus/composables/useFocusSession'
import { useProjects } from '@/modules/projects/composables/useProjects'
import { createTask } from '@/modules/tasks/services/tasks.service'
import { QUICK_CAPTURE_EVENT } from '@/services/native'
import type { CaptureKind } from '@/modules/assistant/types'

const { capture, error } = useCaptures()
const intentions = useIntentions()
const { projects, activeProject, fetchProjects } = useProjects()
// Captures made during a running focus session are linked to it.
const activeSessionId = useActiveSessionId()

const open = ref(false)
const text = ref('')
const kind = ref<CaptureKind>(DEFAULT_CAPTURE_KIND)
const saving = ref(false)
const status = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

// A typed "prefix:" wins over the chip selection, so the chips mirror the result.
const preview = computed(() => parseQuickCapture(text.value, kind.value))

// "tarea …" / "propósito …" (spoken or typed) turn the capture into a task or an intention.
const command = computed(() => parseVoiceCommand(text.value))
const projectId = ref<string | null>(null)
const actionError = ref<string | null>(null)

const canSave = computed(() => {
  if (command.value.type === 'task') return isValidCaptureText(command.value.title) && projectId.value !== null
  if (command.value.type === 'intention') return isValidCaptureText(command.value.text)
  return isValidCaptureText(preview.value.text)
})
const saveLabel = computed(() =>
  command.value.type === 'task' ? 'Create task' : command.value.type === 'intention' ? 'Set intention' : 'Capture',
)
const errorMessage = computed(
  () => actionError.value ?? error.value?.message ?? intentions.error.value?.message ?? null,
)

const voice = useVoiceInput(applyTranscript)
const micIcon = computed(() => {
  switch (voice.phase.value) {
    case 'recording':
      return 'stop_circle'
    case 'downloading':
    case 'transcribing':
      return 'progress_activity'
    default:
      return 'mic'
  }
})
const voiceHint = computed(() => {
  if (voice.error.value) return voice.error.value
  if (voice.phase.value === 'downloading') return voice.progress.value
  if (voice.phase.value === 'recording') return 'Listening… say "tarea …", "propósito …" or just the thought'
  if (voice.phase.value === 'transcribing') return 'Transcribing…'
  return ''
})

/** Spoken capture kinds ("idea, …", "me preocupa …") pick the chip and drop the keyword. */
function applyTranscript(transcript: string): void {
  const cmd = parseVoiceCommand(transcript)
  if (cmd.type === 'capture') {
    kind.value = cmd.kind
    text.value = cmd.text
  } else {
    text.value = transcript
  }
  inputRef.value?.focus()
}

// Pick the spoken project, else the active one, else the first.
watch(
  [() => (command.value.type === 'task' ? command.value.projectHint : null), projects],
  ([hint]) => {
    const match = matchProject(projects.value, hint)
    if (match) projectId.value = match.id
    else if (projectId.value === null) projectId.value = activeProject.value?.id ?? projects.value[0]?.id ?? null
  },
  { immediate: true },
)

async function show(): Promise<void> {
  open.value = true
  status.value = ''
  actionError.value = null
  if (projects.value.length === 0) void fetchProjects()
  await nextTick()
  inputRef.value?.focus()
}

function close(): void {
  void voice.cancel()
  open.value = false
  projectId.value = null
  actionError.value = null
  text.value = ''
  kind.value = DEFAULT_CAPTURE_KIND
}

function pickKind(k: CaptureKind): void {
  kind.value = k
  // Drop a typed prefix so the chip choice applies.
  text.value = preview.value.text
  inputRef.value?.focus()
}

async function save(): Promise<void> {
  if (!canSave.value || saving.value) return
  saving.value = true
  actionError.value = null
  const cmd = command.value
  let done = false

  if (cmd.type === 'task' && projectId.value) {
    const result = await createTask({
      project_id: projectId.value,
      title: cmd.title,
      description: null,
      status: 'todo',
      energy_level: cmd.energy ?? 1,
      impact_score: cmd.impact ?? 1,
      is_attractive: false,
    })
    if (result.error) actionError.value = result.error.message
    else {
      done = true
      status.value = 'Task created'
    }
  } else if (cmd.type === 'intention') {
    // Loads today's list first so the Rule-of-3 slot check is accurate.
    await intentions.load()
    done = await intentions.add('day', new Date(), { text: cmd.text })
    if (done) status.value = "Added to today's intentions"
  } else {
    const saved = await capture(text.value, kind.value, activeSessionId.value)
    if (saved) {
      done = true
      status.value = `Captured as ${getKindInfo(saved.kind).label.toLowerCase()}`
    }
  }

  saving.value = false
  if (done) close()
}

function onKeydown(e: KeyboardEvent): void {
  // e.code keeps Alt+C working on macOS, where Option+C types "ç".
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyC') {
    e.preventDefault()
    if (open.value) close()
    else void show()
  }
}

// Fired by the desktop global shortcut and the tray menu (see @/services/native).
function onNativeCapture(): void {
  if (!open.value) void show()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  window.addEventListener(QUICK_CAPTURE_EVENT, onNativeCapture)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener(QUICK_CAPTURE_EVENT, onNativeCapture)
})
</script>

<style scoped>
.quick-capture {
  position: fixed;
  right: var(--space-lg);
  bottom: var(--space-lg);
  z-index: 1050; /* above Focus Mode (1000), below its settings modal (1100) */
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-sm);
}

.quick-capture__status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.quick-capture__panel {
  width: min(420px, calc(100vw - 2 * var(--space-lg)));
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.quick-capture__input {
  width: 100%;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-family);
  font-size: var(--font-size-body);
  color: var(--color-primary);
  background: var(--color-surface);
  outline: none;
}

.quick-capture__row {
  display: flex;
  gap: var(--space-sm);
}

.quick-capture__row .quick-capture__input {
  flex: 1;
  min-width: 0;
}

.quick-capture__mic {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-primary);
  cursor: pointer;
}

.quick-capture__mic:disabled {
  cursor: progress;
  opacity: 0.6;
}

.quick-capture__mic--recording {
  border-color: var(--color-danger-border);
  background: var(--color-danger-bg);
  color: var(--color-danger-text);
}

.quick-capture__voice-hint,
.quick-capture__meta {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

.quick-capture__target {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

.quick-capture__select {
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 2px var(--space-sm);
  background: var(--color-surface);
  color: var(--color-primary);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
}

.quick-capture__input:focus {
  border-color: var(--color-primary);
}

.quick-capture__kinds {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.quick-capture__kind {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px var(--space-sm);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  cursor: pointer;
}

.quick-capture__kind .material-symbols-outlined {
  font-size: 14px;
}

.quick-capture__kind--active {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.quick-capture__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quick-capture__hint {
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}

.quick-capture__hint kbd,
.quick-capture__fab-kbd {
  padding: 1px 4px;
  border: var(--border-width) solid var(--border-color);
  border-radius: 4px;
  font-family: monospace;
  font-size: var(--font-size-xxs);
}

.quick-capture__save {
  padding: var(--space-xs) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.quick-capture__save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quick-capture__error {
  font-size: var(--font-size-xs);
  color: var(--color-danger-text);
}

.quick-capture__fab {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  cursor: pointer;
  transition: border-color 0.15s;
}

.quick-capture__fab:hover,
.quick-capture__fab--open {
  border-color: var(--color-primary);
}

.quick-capture__fab .material-symbols-outlined {
  font-size: 18px;
}

.quick-capture__fab-kbd {
  color: var(--color-gray-400);
}

/* Clear the app's mobile tab bar (AppLayout, < 768px). */
@media (max-width: 767px) {
  .quick-capture {
    bottom: calc(80px + env(safe-area-inset-bottom));
    right: var(--space-md);
  }
}

@media (max-width: 640px) {
  .quick-capture__fab-label,
  .quick-capture__fab-kbd {
    display: none;
  }
}
</style>
