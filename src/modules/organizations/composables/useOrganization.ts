import { computed, ref, shallowRef } from 'vue'
import * as service from '@/modules/organizations/services/organizations.service'
import { useAuth } from '@/modules/auth/composables/useAuth'
import type {
  AssignableRole,
  Client,
  ClientPayload,
  Organization,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationsError,
} from '@/modules/organizations/types'

/** One organization with its members, invitations and clients. */
export function useOrganization(organizationId: string) {
  const { user } = useAuth()

  const organization = shallowRef<Organization | null>(null)
  const members = ref<OrganizationMember[]>([])
  const invitations = ref<OrganizationInvitation[]>([])
  const clients = ref<Client[]>([])
  const loading = ref(false)
  const error = ref<OrganizationsError | null>(null)

  const myRole = computed(
    () => members.value.find((member) => member.user_id === user.value?.id)?.role ?? null,
  )
  const isAdmin = computed(() => myRole.value === 'owner' || myRole.value === 'admin')
  const isOwner = computed(() => myRole.value === 'owner')

  function setError(result: { error: OrganizationsError | null }): boolean {
    error.value = result.error
    return result.error === null
  }

  async function load(): Promise<void> {
    loading.value = true
    error.value = null

    const [org, memberList, clientList] = await Promise.all([
      service.fetchOrganization(organizationId),
      service.fetchMembers(organizationId),
      service.fetchClients(organizationId),
    ])

    organization.value = org.data
    members.value = memberList.data ?? []
    clients.value = clientList.data ?? []
    error.value = org.error ?? memberList.error ?? clientList.error

    // Invitations are only readable by admins (RLS); members get an empty list.
    if (isAdmin.value) {
      const pending = await service.fetchInvitations(organizationId)
      invitations.value = pending.data ?? []
      error.value ??= pending.error
    } else {
      invitations.value = []
    }

    loading.value = false
  }

  async function rename(name: string): Promise<boolean> {
    const result = await service.renameOrganization(organizationId, name)
    if (result.data) organization.value = result.data
    return setError(result)
  }

  async function remove(): Promise<boolean> {
    return setError(await service.deleteOrganization(organizationId))
  }

  async function changeRole(userId: string, role: AssignableRole): Promise<boolean> {
    const result = await service.updateMemberRole(organizationId, userId, role)
    if (result.data) {
      const updated = result.data
      members.value = members.value.map((member) => (member.user_id === userId ? updated : member))
    }
    return setError(result)
  }

  async function removeMember(userId: string): Promise<boolean> {
    const result = await service.removeMember(organizationId, userId)
    if (!result.error) members.value = members.value.filter((member) => member.user_id !== userId)
    return setError(result)
  }

  async function leave(): Promise<boolean> {
    if (!user.value) return false
    return setError(await service.removeMember(organizationId, user.value.id))
  }

  async function invite(email: string, role: AssignableRole): Promise<boolean> {
    if (members.value.some((member) => member.email.toLowerCase() === email.trim().toLowerCase())) {
      error.value = { message: 'That person is already a member' }
      return false
    }
    const result = await service.createInvitation(organizationId, email, role)
    if (result.data) invitations.value = [result.data, ...invitations.value]
    return setError(result)
  }

  async function revokeInvitation(id: string): Promise<boolean> {
    const result = await service.deleteInvitation(id)
    if (!result.error) invitations.value = invitations.value.filter((invitation) => invitation.id !== id)
    return setError(result)
  }

  function sortClients(list: Client[]): Client[] {
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }

  async function addClient(payload: ClientPayload): Promise<boolean> {
    const result = await service.createClient(organizationId, payload)
    if (result.data) clients.value = sortClients([...clients.value, result.data])
    return setError(result)
  }

  async function editClient(id: string, payload: ClientPayload): Promise<boolean> {
    const result = await service.updateClient(id, payload)
    if (result.data) {
      const updated = result.data
      clients.value = sortClients(clients.value.map((client) => (client.id === id ? updated : client)))
    }
    return setError(result)
  }

  async function removeClient(id: string): Promise<boolean> {
    const result = await service.deleteClient(id)
    if (!result.error) clients.value = clients.value.filter((client) => client.id !== id)
    return setError(result)
  }

  function clearError(): void {
    error.value = null
  }

  return {
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
    clearError,
  }
}
