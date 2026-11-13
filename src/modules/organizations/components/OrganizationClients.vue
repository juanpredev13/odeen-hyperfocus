<template>
  <section class="org-clients" aria-labelledby="org-clients-title">
    <header class="org-clients__header">
      <h2 id="org-clients-title" class="org-clients__title">Clients</h2>
      <button v-if="isAdmin && !adding" class="org-clients__add" type="button" @click="adding = true">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        New client
      </button>
    </header>

    <ClientForm
      v-if="adding"
      submit-label="Add client"
      :on-save="handleAdd"
      @cancel="adding = false"
    />

    <p v-if="!clients.length && !adding" class="org-clients__empty">
      {{ isAdmin ? 'No clients yet. Add the first one.' : 'No clients yet.' }}
    </p>

    <ul class="org-clients__list">
      <li v-for="client in clients" :key="client.id" class="client-row">
        <ClientForm
          v-if="editingId === client.id"
          :initial="client"
          submit-label="Save"
          :on-save="(payload) => handleEdit(client.id, payload)"
          @cancel="editingId = null"
        />
        <template v-else>
          <div class="client-row__main">
            <p class="client-row__name">{{ client.name }}</p>
            <p v-if="client.email || client.phone" class="client-row__contact">
              <span v-if="client.email">{{ client.email }}</span>
              <span v-if="client.email && client.phone" aria-hidden="true"> · </span>
              <span v-if="client.phone">{{ client.phone }}</span>
            </p>
            <p v-if="client.notes" class="client-row__notes">{{ client.notes }}</p>
          </div>
          <div v-if="isAdmin" class="client-row__actions">
            <button
              class="client-row__icon-btn"
              type="button"
              :aria-label="`Edit ${client.name}`"
              @click="editingId = client.id"
            >
              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            </button>
            <button
              class="client-row__icon-btn client-row__icon-btn--danger"
              type="button"
              :aria-label="`Delete ${client.name}`"
              @click="onRemove(client.id, client.name)"
            >
              <span class="material-symbols-outlined" aria-hidden="true">delete</span>
            </button>
          </div>
        </template>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ClientForm from '@/modules/organizations/components/ClientForm.vue'
import type { Client, ClientPayload } from '@/modules/organizations/types'

const props = defineProps<{
  clients: Client[]
  isAdmin: boolean
  onAdd: (payload: ClientPayload) => Promise<boolean>
  onEdit: (id: string, payload: ClientPayload) => Promise<boolean>
  onRemove: (id: string, name: string) => Promise<void>
}>()

const adding = ref(false)
const editingId = ref<string | null>(null)

async function handleAdd(payload: ClientPayload): Promise<boolean> {
  const saved = await props.onAdd(payload)
  if (saved) adding.value = false
  return saved
}

async function handleEdit(id: string, payload: ClientPayload): Promise<boolean> {
  const saved = await props.onEdit(id, payload)
  if (saved) editingId.value = null
  return saved
}
</script>

<style scoped>
.org-clients {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.org-clients__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.org-clients__title {
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.org-clients__add {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: none;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  cursor: pointer;
}

.org-clients__add .material-symbols-outlined {
  font-size: var(--icon-size-sm);
}

.org-clients__empty {
  font-size: var(--font-size-sm);
  color: var(--color-gray-400);
}

.org-clients__list {
  display: flex;
  flex-direction: column;
  list-style: none;
}

.client-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  border-top: var(--border-width) solid var(--border-color);
}

.client-row:first-child {
  border-top: none;
}

.client-row > .client-form {
  flex: 1;
}

.client-row__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.client-row__name {
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.client-row__contact,
.client-row__notes {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  overflow-wrap: anywhere;
}

.client-row__notes {
  white-space: pre-line;
}

.client-row__actions {
  display: flex;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.client-row__icon-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-full);
  background: none;
  color: var(--color-gray-500);
  cursor: pointer;
}

.client-row__icon-btn .material-symbols-outlined {
  font-size: var(--icon-size-sm);
}

.client-row__icon-btn:hover {
  background-color: var(--color-gray-100);
  color: var(--color-primary);
}

.client-row__icon-btn--danger:hover {
  background-color: var(--color-danger-bg);
  color: var(--color-danger-text);
}
</style>
