<template>
  <div class="settings-overlay" @click.self="emit('close')">
    <form
      class="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-settings-title"
      @submit.prevent="save"
      @keydown.esc.stop.prevent="emit('close')"
    >
      <button class="settings-modal__close" type="button" aria-label="Close" @click="emit('close')">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>

      <h2 id="session-settings-title" class="settings-modal__title">Session Settings</h2>
      <p class="settings-modal__subtitle">Defaults for your focus sessions</p>

      <label class="settings-modal__field">
        <span class="settings-modal__label">Default length (minutes)</span>
        <input
          ref="firstInput"
          v-model.number="length"
          class="settings-modal__input settings-modal__input--number"
          type="number"
          :min="MIN_SESSION_MINUTES"
          :max="MAX_SESSION_MINUTES"
        />
        <span class="settings-modal__help">Used until you have a few sessions; then ODEEN suggests your usual length.</span>
      </label>

      <div class="settings-modal__field">
        <span id="checklist-label" class="settings-modal__label">Distraction checklist</span>
        <ul class="settings-modal__list" aria-labelledby="checklist-label">
          <li v-for="(_item, i) in checklist" :key="i" class="settings-modal__item">
            <input
              v-model="checklist[i]"
              class="settings-modal__input"
              type="text"
              :aria-label="`Checklist item ${i + 1}`"
            />
            <button class="settings-modal__icon-btn" type="button" :disabled="i === 0" :aria-label="`Move item ${i + 1} up`" @click="move(i, -1)">
              <span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
            </button>
            <button class="settings-modal__icon-btn" type="button" :disabled="i === checklist.length - 1" :aria-label="`Move item ${i + 1} down`" @click="move(i, 1)">
              <span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span>
            </button>
            <button class="settings-modal__icon-btn" type="button" :aria-label="`Remove item ${i + 1}`" @click="checklist.splice(i, 1)">
              <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </li>
        </ul>
        <div class="settings-modal__add">
          <input
            v-model="newItem"
            class="settings-modal__input"
            type="text"
            placeholder="Add an item, e.g. Close Slack"
            aria-label="New checklist item"
            @keydown.enter.prevent="addItem"
          />
          <button class="settings-modal__add-btn" type="button" :disabled="!newItem.trim()" @click="addItem">Add</button>
        </div>
      </div>

      <label class="settings-modal__toggle">
        <span class="settings-modal__label">Sound at end of session</span>
        <input v-model="endSound" class="settings-modal__switch" type="checkbox" role="switch" />
      </label>

      <p v-if="error" class="settings-modal__error" role="alert">{{ error }}</p>

      <button class="settings-modal__save" type="submit" :disabled="saving">
        {{ saving ? 'Saving…' : 'Save Changes' }}
      </button>
      <button class="settings-modal__cancel" type="button" @click="emit('close')">Cancel</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAssistantSettings } from '@/modules/assistant/composables/useAssistantSettings'
import {
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  clampMinutes,
} from '@/modules/focus/composables/sessionHelpers'

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { effectiveSettings, saveSettings, error: settingsError } = useAssistantSettings()
const current = effectiveSettings()

const length = ref(current.default_session_minutes)
const checklist = ref<string[]>([...current.distraction_checklist])
const endSound = ref(current.end_sound)
const newItem = ref('')
const saving = ref(false)
const error = ref('')
const firstInput = ref<HTMLInputElement | null>(null)

onMounted(() => firstInput.value?.focus())

function move(index: number, delta: -1 | 1): void {
  const target = index + delta
  const items = checklist.value
  const a = items[index]
  const b = items[target]
  if (a === undefined || b === undefined) return
  items[index] = b
  items[target] = a
}

function addItem(): void {
  const item = newItem.value.trim()
  if (!item) return
  checklist.value.push(item)
  newItem.value = ''
}

async function save(): Promise<void> {
  saving.value = true
  error.value = ''
  const ok = await saveSettings({
    default_session_minutes: clampMinutes(length.value),
    distraction_checklist: checklist.value.map((i) => i.trim()).filter(Boolean),
    end_sound: endSound.value,
  })
  saving.value = false
  if (!ok) {
    error.value = settingsError.value?.message ?? 'Could not save settings'
    return
  }
  emit('saved')
  emit('close')
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  backdrop-filter: blur(6px);
}

.settings-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: min(460px, 100%);
  max-height: calc(100vh - 2 * var(--space-md));
  overflow-y: auto;
  padding: var(--space-lg);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.settings-modal__close {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  display: flex;
  border: none;
  background: none;
  color: var(--color-gray-400);
  cursor: pointer;
}

.settings-modal__close:hover {
  color: var(--color-primary);
}

.settings-modal__title {
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.settings-modal__subtitle {
  margin-top: calc(-1 * var(--space-sm));
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.settings-modal__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.settings-modal__label {
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-gray-400);
}

.settings-modal__help {
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}

.settings-modal__input {
  flex: 1;
  min-width: 0;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-sm);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background: var(--color-surface);
}

.settings-modal__input--number {
  flex: none;
  width: 96px;
}

.settings-modal__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.settings-modal__item,
.settings-modal__add {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.settings-modal__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  color: var(--color-gray-400);
  cursor: pointer;
}

.settings-modal__icon-btn:hover:not(:disabled) {
  color: var(--color-primary);
  background: var(--color-background);
}

.settings-modal__icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.settings-modal__icon-btn .material-symbols-outlined {
  font-size: 16px;
}

.settings-modal__add-btn {
  padding: var(--space-xs) var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  cursor: pointer;
}

.settings-modal__add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.settings-modal__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.settings-modal__switch {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}

.settings-modal__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}

.settings-modal__save {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.settings-modal__save:disabled {
  opacity: 0.5;
}

.settings-modal__cancel {
  align-self: center;
  margin-top: calc(-1 * var(--space-sm));
  border: none;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  cursor: pointer;
}

.settings-modal__cancel:hover {
  color: var(--color-primary);
}
</style>
