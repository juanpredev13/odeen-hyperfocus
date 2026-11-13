import { ref } from 'vue'
import * as service from '@/modules/organizations/services/organizations.service'
import type {
  OrganizationSummary,
  OrganizationsError,
  PendingInvitation,
} from '@/modules/organizations/types'

/** The signed-in user's organizations and the invitations waiting for them. */
export function useOrganizations() {
  const organizations = ref<OrganizationSummary[]>([])
  const invitations = ref<PendingInvitation[]>([])
  const loading = ref(false)
  const error = ref<OrganizationsError | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null

    const [orgs, pending] = await Promise.all([
      service.fetchMyOrganizations(),
      service.fetchPendingInvitations(),
    ])

    loading.value = false
    error.value = orgs.error ?? pending.error
    organizations.value = orgs.data ?? []
    invitations.value = pending.data ?? []
  }

  /** Returns the new organization's id, or null on failure. */
  async function create(name: string): Promise<string | null> {
    error.value = null
    const result = await service.createOrganization(name)
    if (result.error) {
      error.value = result.error
      return null
    }
    await load()
    return result.data
  }

  async function accept(invitationId: string): Promise<string | null> {
    error.value = null
    const result = await service.acceptInvitation(invitationId)
    if (result.error) {
      error.value = result.error
      return null
    }
    await load()
    return result.data
  }

  async function decline(invitationId: string): Promise<void> {
    error.value = null
    const result = await service.deleteInvitation(invitationId)
    if (result.error) {
      error.value = result.error
      return
    }
    invitations.value = invitations.value.filter((invitation) => invitation.id !== invitationId)
  }

  return { organizations, invitations, loading, error, load, create, accept, decline }
}
