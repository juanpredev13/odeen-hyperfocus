<template>
  <div class="org">
    <RouterLink class="org__back" to="/organizations">
      <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      Organizations
    </RouterLink>

    <p v-if="loading && !organization" class="org__empty">Loading…</p>
    <p v-else-if="!organization" class="org__error" role="alert">
      {{ error?.message ?? 'Organization not found' }}
    </p>

    <template v-else>
      <header class="org__header">
        <form v-if="renaming" class="org__rename" @submit.prevent="handleRename">
          <input
            v-model="newName"
            class="org__rename-input"
            type="text"
            aria-label="Organization name"
            :maxlength="ORGANIZATION_LIMITS.name"
            required
          />
          <button class="org__btn org__btn--primary" type="submit" :disabled="!newName.trim()">Save</button>
          <button class="org__btn" type="button" @click="renaming = false">Cancel</button>
        </form>
        <template v-else>
          <h1 class="org__title">{{ organization.name }}</h1>
          <span v-if="myRole" class="org__role">{{ myRole }}</span>
        </template>

        <div v-if="!renaming" class="org__actions">
          <button v-if="isAdmin" class="org__btn" type="button" @click="startRename">Rename</button>
          <button v-if="myRole && !isOwner" class="org__btn" type="button" @click="handleLeave">Leave</button>
          <button v-if="isOwner" class="org__btn org__btn--danger" type="button" @click="handleDelete">
            Delete
          </button>
        </div>
      </header>

      <p v-if="error" class="org__error" role="alert">{{ error.message }}</p>

      <OrganizationClients
        :clients="clients"
        :is-admin="isAdmin"
        :on-add="addClient"
        :on-edit="editClient"
        :on-remove="handleRemoveClient"
      />

      <OrganizationMembers
        :members="members"
        :invitations="invitations"
        :is-admin="isAdmin"
        :current-user-id="user?.id ?? null"
        :on-change-role="changeRole"
        :on-remove="handleRemoveMember"
        :on-invite="invite"
        :on-revoke="revokeInvitation"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/modules/auth/composables/useAuth'
import { useOrganization } from '@/modules/organizations/composables/useOrganization'
import OrganizationClients from '@/modules/organizations/components/OrganizationClients.vue'
import OrganizationMembers from '@/modules/organizations/components/OrganizationMembers.vue'
import { ORGANIZATION_LIMITS } from '@/modules/organizations/types'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()

// Organization pages are only reached from the list, which remounts this view, so the id
// is fixed for its lifetime.
const {
  organization,
  members,
  invitations,
  clients,
  loading,
  error,
  myRole,
  isAdmin,
  isOwner,
  load,
  rename,
  remove,
  changeRole,
  removeMember,
  leave,
  invite,
  revokeInvitation,
  addClient,
  editClient,
  removeClient,
} = useOrganization(String(route.params.id))

const renaming = ref(false)
const newName = ref('')

onMounted(load)

function startRename(): void {
  newName.value = organization.value?.name ?? ''
  renaming.value = true
}

async function handleRename(): Promise<void> {
  if (await rename(newName.value)) renaming.value = false
}

async function handleLeave(): Promise<void> {
  if (!confirm(`Leave ${organization.value?.name}? You will lose access until invited again.`)) return
  if (await leave()) await router.push('/organizations')
}

async function handleDelete(): Promise<void> {
  if (!confirm(`Delete ${organization.value?.name} with all its clients? This cannot be undone.`)) return
  if (await remove()) await router.push('/organizations')
}

async function handleRemoveMember(userId: string, email: string): Promise<void> {
  if (!confirm(`Remove ${email} from this organization?`)) return
  await removeMember(userId)
}

async function handleRemoveClient(id: string, name: string): Promise<void> {
  if (!confirm(`Delete client ${name}?`)) return
  await removeClient(id)
}
</script>

<style scoped>
.org {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-xl);
  max-width: 720px;
  height: 100%;
  overflow-y: auto;
}

.org__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  align-self: flex-start;
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  text-decoration: none;
}

.org__back .material-symbols-outlined {
  font-size: var(--icon-size-sm);
}

.org__back:hover {
  color: var(--color-primary);
}

.org__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
}

.org__title {
  font-family: var(--font-display);
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-primary);
  overflow-wrap: anywhere;
}

.org__role {
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  background-color: var(--color-status-neutral);
  color: var(--color-status-neutral-text);
}

.org__actions {
  display: flex;
  gap: var(--space-xs);
  margin-left: auto;
}

.org__rename {
  display: flex;
  flex: 1;
  gap: var(--space-sm);
}

.org__rename-input {
  flex: 1;
  min-width: 0;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  color: var(--color-primary);
  background-color: var(--color-surface);
  outline: none;
}

.org__rename-input:focus {
  border-color: var(--color-primary);
}

.org__btn {
  padding: var(--space-xs) var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  cursor: pointer;
}

.org__btn--primary {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.org__btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.org__btn--danger {
  border-color: var(--color-danger-border);
  color: var(--color-danger-text);
}

.org__btn--danger:hover {
  background-color: var(--color-danger-bg);
}

.org__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}

.org__empty {
  font-size: var(--font-size-sm);
  color: var(--color-gray-400);
}

@media (max-width: 600px) {
  .org {
    padding: var(--space-md);
  }

  .org__actions {
    margin-left: 0;
  }
}
</style>
