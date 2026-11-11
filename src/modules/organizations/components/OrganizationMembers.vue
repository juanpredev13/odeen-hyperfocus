<template>
  <section class="org-members" aria-labelledby="org-members-title">
    <header class="org-members__header">
      <h2 id="org-members-title" class="org-members__title">Collaborators</h2>
      <span class="org-members__count">{{ members.length }}</span>
    </header>

    <ul class="org-members__list">
      <li v-for="member in members" :key="member.user_id" class="member-row">
        <div class="member-row__main">
          <p class="member-row__email">
            {{ member.email }}
            <span v-if="member.user_id === currentUserId" class="member-row__you">(you)</span>
          </p>
        </div>

        <select
          v-if="canEdit(member)"
          class="member-row__role-select"
          :value="member.role"
          :aria-label="`Role of ${member.email}`"
          @change="onChangeRole(member.user_id, roleFrom($event))"
        >
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </select>
        <span v-else class="member-row__role" :class="`member-row__role--${member.role}`">
          {{ ROLE_LABELS[member.role] }}
        </span>

        <button
          v-if="canEdit(member)"
          class="member-row__remove"
          type="button"
          :aria-label="`Remove ${member.email}`"
          @click="onRemove(member.user_id, member.email)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">person_remove</span>
        </button>
      </li>
    </ul>

    <template v-if="isAdmin">
      <form class="org-members__invite" @submit.prevent="handleInvite">
        <label class="org-members__invite-label" for="invite-email">Invite a collaborator</label>
        <div class="org-members__invite-row">
          <input
            id="invite-email"
            v-model="email"
            class="org-members__input"
            type="email"
            placeholder="name@example.com"
            maxlength="254"
            required
          />
          <select v-model="role" class="org-members__input org-members__input--role" aria-label="Role">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button class="org-members__invite-btn" type="submit" :disabled="inviting || !email.trim()">
            {{ inviting ? 'Inviting…' : 'Invite' }}
          </button>
        </div>
        <p class="org-members__hint">
          They accept from Organizations after signing in with this email. No email is sent.
        </p>
      </form>

      <div v-if="invitations.length" class="org-members__pending">
        <h3 class="org-members__subtitle">Pending invitations</h3>
        <ul class="org-members__list">
          <li v-for="invitation in invitations" :key="invitation.id" class="member-row">
            <div class="member-row__main">
              <p class="member-row__email">{{ invitation.email }}</p>
            </div>
            <span class="member-row__role member-row__role--pending">{{ ROLE_LABELS[invitation.role] }}</span>
            <button
              class="member-row__remove"
              type="button"
              :aria-label="`Revoke invitation for ${invitation.email}`"
              @click="onRevoke(invitation.id)"
            >
              <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type {
  AssignableRole,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationRole,
} from '@/modules/organizations/types'

const props = defineProps<{
  members: OrganizationMember[]
  invitations: OrganizationInvitation[]
  isAdmin: boolean
  currentUserId: string | null
  onChangeRole: (userId: string, role: AssignableRole) => Promise<boolean>
  onRemove: (userId: string, email: string) => Promise<void>
  onInvite: (email: string, role: AssignableRole) => Promise<boolean>
  onRevoke: (id: string) => Promise<boolean>
}>()

const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

const email = ref('')
const role = ref<AssignableRole>('member')
const inviting = ref(false)

/** Admins manage everyone except the owner and themselves (leaving is a separate action). */
function canEdit(member: OrganizationMember): boolean {
  return props.isAdmin && member.role !== 'owner' && member.user_id !== props.currentUserId
}

function roleFrom(event: Event): AssignableRole {
  const value = (event.target as HTMLSelectElement).value
  return value === 'admin' ? 'admin' : 'member'
}

async function handleInvite(): Promise<void> {
  inviting.value = true
  const invited = await props.onInvite(email.value, role.value)
  inviting.value = false
  if (invited) {
    email.value = ''
    role.value = 'member'
  }
}
</script>

<style scoped>
.org-members {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.org-members__header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.org-members__title,
.org-members__subtitle,
.org-members__invite-label {
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
}

.org-members__count {
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}

.org-members__list {
  display: flex;
  flex-direction: column;
  list-style: none;
}

.member-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-top: var(--border-width) solid var(--border-color);
}

.member-row:first-child {
  border-top: none;
}

.member-row__main {
  flex: 1;
  min-width: 0;
}

.member-row__email {
  color: var(--color-primary);
  overflow-wrap: anywhere;
}

.member-row__you {
  font-size: var(--font-size-sm);
  color: var(--color-gray-400);
}

.member-row__role {
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

.member-row__role--owner {
  background-color: var(--color-status-done);
  color: var(--color-status-done-text);
}

.member-row__role--admin {
  background-color: var(--color-status-active);
  color: var(--color-status-active-text);
}

.member-row__role--pending {
  background-color: var(--color-warning-bg);
  color: var(--color-warning-text);
}

.member-row__role-select,
.org-members__input {
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-sm);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background-color: var(--color-surface);
  outline: none;
}

.member-row__role-select:focus,
.org-members__input:focus {
  border-color: var(--color-primary);
}

.member-row__remove {
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

.member-row__remove .material-symbols-outlined {
  font-size: var(--icon-size-sm);
}

.member-row__remove:hover {
  background-color: var(--color-danger-bg);
  color: var(--color-danger-text);
}

.org-members__invite {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding-top: var(--space-md);
  border-top: var(--border-width) solid var(--border-color);
}

.org-members__invite-row {
  display: flex;
  gap: var(--space-sm);
}

.org-members__input {
  flex: 1;
  min-width: 0;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-body);
}

.org-members__input--role {
  flex: 0 0 auto;
}

.org-members__invite-btn {
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.org-members__invite-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.org-members__hint {
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}

.org-members__pending {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

@media (max-width: 600px) {
  .org-members__invite-row {
    flex-wrap: wrap;
  }

  .org-members__input {
    flex-basis: 100%;
  }
}
</style>
