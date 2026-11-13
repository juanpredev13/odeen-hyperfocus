<template>
  <div class="sharing-fields">
    <label class="sharing-fields__field">
      <span class="sharing-fields__label">Organization</span>
      <select
        class="sharing-fields__select"
        :value="modelValue.organization_id ?? ''"
        @change="onOrganizationChange"
        @click.stop
      >
        <option value="">Personal</option>
        <option v-for="org in organizations" :key="org.id" :value="org.id">{{ org.name }}</option>
      </select>
    </label>

    <label class="sharing-fields__field">
      <span class="sharing-fields__label">Client</span>
      <select
        class="sharing-fields__select"
        :value="modelValue.client_id ?? ''"
        :disabled="!modelValue.organization_id"
        @change="onClientChange"
        @click.stop
      >
        <option value="">{{ modelValue.organization_id ? 'No client' : 'Pick an organization first' }}</option>
        <option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
import type { ProjectRef, ProjectSharing } from '@/modules/projects/types'

const props = defineProps<{
  modelValue: ProjectSharing
  organizations: ProjectRef[]
  /** Clients of the selected organization. */
  clients: ProjectRef[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ProjectSharing]
}>()

function onOrganizationChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  // Changing the organization always resets the client: clients belong to one organization.
  emit('update:modelValue', { organization_id: value || null, client_id: null })
}

function onClientChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  emit('update:modelValue', { ...props.modelValue, client_id: value || null })
}
</script>

<style scoped>
.sharing-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-sm);
  width: 100%;
}

.sharing-fields__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.sharing-fields__label {
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.sharing-fields__select {
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-sm);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background-color: var(--color-surface);
  outline: none;
  transition: border-color 0.2s;
}

.sharing-fields__select:focus {
  border-color: var(--color-primary);
}

.sharing-fields__select:disabled {
  color: var(--color-gray-400);
  cursor: not-allowed;
}
</style>
