<template>
  <form class="client-form" @submit.prevent="handleSubmit">
    <div class="client-form__grid">
      <label class="client-form__field client-form__field--wide">
        <span class="client-form__label">Name</span>
        <input
          v-model="form.name"
          class="client-form__input"
          type="text"
          :maxlength="ORGANIZATION_LIMITS.name"
          required
        />
      </label>
      <label class="client-form__field">
        <span class="client-form__label">Email</span>
        <input
          v-model="form.email"
          class="client-form__input"
          type="email"
          :maxlength="ORGANIZATION_LIMITS.email"
        />
      </label>
      <label class="client-form__field">
        <span class="client-form__label">Phone</span>
        <input
          v-model="form.phone"
          class="client-form__input"
          type="tel"
          :maxlength="ORGANIZATION_LIMITS.phone"
        />
      </label>
      <label class="client-form__field client-form__field--wide">
        <span class="client-form__label">Notes</span>
        <textarea
          v-model="form.notes"
          class="client-form__input client-form__input--notes"
          rows="3"
          :maxlength="ORGANIZATION_LIMITS.notes"
        ></textarea>
      </label>
    </div>

    <div class="client-form__actions">
      <button class="client-form__submit" type="submit" :disabled="saving || !form.name.trim()">
        {{ saving ? 'Saving…' : submitLabel }}
      </button>
      <button class="client-form__cancel" type="button" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ORGANIZATION_LIMITS, type Client, type ClientPayload } from '@/modules/organizations/types'

const props = defineProps<{
  initial?: Client | null
  submitLabel: string
  onSave: (payload: ClientPayload) => Promise<boolean>
}>()

const emit = defineEmits<{ cancel: [] }>()

const form = reactive<ClientPayload>({
  name: props.initial?.name ?? '',
  email: props.initial?.email ?? '',
  phone: props.initial?.phone ?? '',
  notes: props.initial?.notes ?? '',
})
const saving = ref(false)

async function handleSubmit(): Promise<void> {
  saving.value = true
  const saved = await props.onSave({ ...form })
  saving.value = false
  if (saved && !props.initial) {
    form.name = ''
    form.email = ''
    form.phone = ''
    form.notes = ''
  }
}
</script>

<style scoped>
.client-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
}

.client-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm) var(--space-md);
}

.client-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.client-form__field--wide {
  grid-column: 1 / -1;
}

.client-form__label {
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.client-form__input {
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-family);
  font-size: var(--font-size-body);
  color: var(--color-primary);
  background-color: var(--color-surface);
  outline: none;
  transition: border-color 0.2s;
}

.client-form__input:focus {
  border-color: var(--color-primary);
}

.client-form__input--notes {
  resize: vertical;
}

.client-form__actions {
  display: flex;
  gap: var(--space-sm);
}

.client-form__submit,
.client-form__cancel {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.client-form__submit {
  border: none;
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.client-form__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.client-form__cancel {
  border: var(--border-width) solid var(--border-color);
  background: none;
  color: var(--color-gray-500);
}

@media (max-width: 600px) {
  .client-form__grid {
    grid-template-columns: 1fr;
  }
}
</style>
