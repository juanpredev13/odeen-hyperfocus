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
      <input
        ref="inputRef"
        v-model="text"
        class="quick-capture__input"
        type="text"
        :maxlength="MAX_CAPTURE_LENGTH"
        placeholder="Capture anything… (idea: / problem: / worry: / waiting:)"
        aria-label="Capture text"
        @keydown.esc.stop.prevent="close"
      />

      <div class="quick-capture__kinds" role="radiogroup" aria-label="Kind">
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
        <button class="quick-capture__save" type="submit" :disabled="saving || !canSave">Capture</button>
      </div>
      <p v-if="error" class="quick-capture__error" role="alert">{{ error.message }}</p>
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
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useCaptures } from '@/modules/assistant/composables/useCaptures'
import {
  CAPTURE_KINDS,
  DEFAULT_CAPTURE_KIND,
  MAX_CAPTURE_LENGTH,
  getKindInfo,
  isValidCaptureText,
  parseQuickCapture,
} from '@/modules/assistant/composables/captureHelpers'
import { useActiveSessionId } from '@/modules/focus/composables/useFocusSession'
import type { CaptureKind } from '@/modules/assistant/types'

const { capture, error } = useCaptures()
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
const canSave = computed(() => isValidCaptureText(preview.value.text))

async function show(): Promise<void> {
  open.value = true
  status.value = ''
  await nextTick()
  inputRef.value?.focus()
}

function close(): void {
  open.value = false
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
  const saved = await capture(text.value, kind.value, activeSessionId.value)
  saving.value = false
  if (!saved) return
  status.value = `Captured as ${getKindInfo(saved.kind).label.toLowerCase()}`
  close()
}

function onKeydown(e: KeyboardEvent): void {
  // e.code keeps Alt+C working on macOS, where Option+C types "ç".
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyC') {
    e.preventDefault()
    if (open.value) close()
    else void show()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
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

@media (max-width: 640px) {
  .quick-capture__fab-label,
  .quick-capture__fab-kbd {
    display: none;
  }
}
</style>
