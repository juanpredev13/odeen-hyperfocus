<template>
  <div class="orgs">
    <header class="orgs__header">
      <h1 class="orgs__title">Organizations</h1>
    </header>

    <form class="orgs__create" @submit.prevent="handleCreate">
      <label class="orgs__label" for="org-name">New organization</label>
      <div class="orgs__create-row">
        <input
          id="org-name"
          v-model="name"
          class="orgs__input"
          type="text"
          placeholder="e.g. Studio Norte"
          :maxlength="ORGANIZATION_LIMITS.name"
          required
        />
        <button class="orgs__create-btn" type="submit" :disabled="creating || !name.trim()">
          {{ creating ? 'Creating…' : 'Create' }}
        </button>
      </div>
    </form>

    <p v-if="error" class="orgs__error" role="alert">{{ error.message }}</p>

    <section v-if="invitations.length" class="orgs__section" aria-labelledby="orgs-invites-title">
      <h2 id="orgs-invites-title" class="orgs__label">Invitations</h2>
      <ul class="orgs__list">
        <li v-for="invitation in invitations" :key="invitation.id" class="org-invite">
          <p class="org-invite__text">
            You are invited to <strong>{{ invitation.organization_name }}</strong> as
            {{ invitation.role === 'admin' ? 'an admin' : 'a member' }}.
          </p>
          <div class="org-invite__actions">
            <button class="org-invite__accept" type="button" @click="handleAccept(invitation.id)">
              Accept
            </button>
            <button class="org-invite__decline" type="button" @click="decline(invitation.id)">
              Decline
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section class="orgs__section" aria-labelledby="orgs-list-title">
      <h2 id="orgs-list-title" class="orgs__label">Your organizations</h2>
      <p v-if="loading && !organizations.length" class="orgs__empty">Loading…</p>
      <p v-else-if="!organizations.length" class="orgs__empty">
        You are not in any organization yet. Create one above.
      </p>
      <ul class="orgs__list">
        <li v-for="organization in organizations" :key="organization.id">
          <RouterLink class="org-card" :to="`/organizations/${organization.id}`">
            <span class="org-card__name">{{ organization.name }}</span>
            <span class="org-card__role">{{ organization.role }}</span>
            <span class="material-symbols-outlined org-card__chevron" aria-hidden="true">chevron_right</span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOrganizations } from '@/modules/organizations/composables/useOrganizations'
import { ORGANIZATION_LIMITS } from '@/modules/organizations/types'

const router = useRouter()
const { organizations, invitations, loading, error, load, create, accept, decline } = useOrganizations()

const name = ref('')
const creating = ref(false)

onMounted(load)

async function handleCreate(): Promise<void> {
  creating.value = true
  const id = await create(name.value)
  creating.value = false
  if (id) {
    name.value = ''
    await router.push(`/organizations/${id}`)
  }
}

async function handleAccept(invitationId: string): Promise<void> {
  const id = await accept(invitationId)
  if (id) await router.push(`/organizations/${id}`)
}
</script>

<style scoped>
.orgs {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-xl);
  max-width: 720px;
  height: 100%;
  overflow-y: auto;
}

.orgs__title {
  font-family: var(--font-display);
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-primary);
}

.orgs__label {
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.orgs__create {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.orgs__create-row {
  display: flex;
  gap: var(--space-sm);
}

.orgs__input {
  flex: 1;
  min-width: 0;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-family);
  font-size: var(--font-size-body);
  color: var(--color-primary);
  background-color: var(--color-surface);
  outline: none;
}

.orgs__input:focus {
  border-color: var(--color-primary);
}

.orgs__create-btn {
  padding: var(--space-sm) var(--space-lg);
  border: none;
  border-radius: var(--radius-full);
  background-color: var(--color-accent);
  color: var(--color-on-accent);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.orgs__create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.orgs__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}

.orgs__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.orgs__empty {
  font-size: var(--font-size-sm);
  color: var(--color-gray-400);
}

.orgs__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  list-style: none;
}

.org-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
  color: var(--color-primary);
  text-decoration: none;
  transition: transform 0.15s;
}

.org-card:hover {
  transform: translateY(-1px);
}

.org-card__name {
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}

.org-card__role {
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

.org-card__chevron {
  color: var(--color-gray-400);
}

.org-invite {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  border: var(--border-width) solid var(--color-warning-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-warning-bg);
}

.org-invite__text {
  font-size: var(--font-size-sm);
  color: var(--color-warning-text);
}

.org-invite__actions {
  display: flex;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.org-invite__accept,
.org-invite__decline {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.org-invite__accept {
  border: none;
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.org-invite__decline {
  border: var(--border-width) solid var(--border-color);
  background-color: var(--color-surface);
  color: var(--color-gray-500);
}

@media (max-width: 600px) {
  .orgs {
    padding: var(--space-md);
  }

  .org-invite {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
