import { ref } from 'vue'
import { fetchClients, fetchMyOrganizations } from '@/modules/organizations/services/organizations.service'
import type { ProjectRef, ProjectsError } from '@/modules/projects/types'

/**
 * Options for sharing a project: the signed-in user's organizations and, per
 * organization, its clients (loaded on demand and cached).
 */
export function useProjectSharing() {
  const organizations = ref<ProjectRef[]>([])
  const clientsByOrganization = ref<Record<string, ProjectRef[]>>({})
  const error = ref<ProjectsError | null>(null)

  async function loadOrganizations(): Promise<void> {
    const result = await fetchMyOrganizations()
    if (result.error) {
      error.value = result.error
      return
    }
    organizations.value = (result.data ?? []).map(({ id, name }) => ({ id, name }))
  }

  async function ensureClients(organizationId: string | null): Promise<void> {
    if (!organizationId || clientsByOrganization.value[organizationId]) return

    const result = await fetchClients(organizationId)
    if (result.error) {
      error.value = result.error
      return
    }
    clientsByOrganization.value = {
      ...clientsByOrganization.value,
      [organizationId]: (result.data ?? []).map(({ id, name }) => ({ id, name })),
    }
  }

  function clientsFor(organizationId: string | null): ProjectRef[] {
    return organizationId ? (clientsByOrganization.value[organizationId] ?? []) : []
  }

  return { organizations, error, loadOrganizations, ensureClients, clientsFor }
}
