import { ref } from 'vue'
import * as connectionsService from '@/modules/assistant/services/connections.service'
import type {
  AssistantConnection,
  AssistantError,
  Provider,
  ProviderInfo,
} from '@/modules/assistant/types'

export const PROVIDERS: readonly ProviderInfo[] = [
  {
    id: 'google-calendar',
    label: 'Google Calendar',
    description: 'Protect focus time around your meetings.',
    icon: 'calendar_month',
  },
  {
    id: 'gmail',
    label: 'Gmail',
    description: 'Check email in batches instead of all day.',
    icon: 'mail',
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    description: 'Bring open loops and ideas from your notes.',
    icon: 'description',
  },
]

const connections = ref<AssistantConnection[]>([])
const loading = ref(false)
const error = ref<AssistantError | null>(null)

export function useAssistantConnections() {
  async function fetchConnections(): Promise<void> {
    loading.value = true
    error.value = null

    const result = await connectionsService.fetchConnections()

    loading.value = false
    if (result.error) {
      error.value = result.error
      return
    }

    connections.value = result.data ?? []
  }

  function getConnection(provider: Provider): AssistantConnection | undefined {
    return connections.value.find((c) => c.provider === provider)
  }

  async function disconnect(provider: Provider): Promise<boolean> {
    const connection = getConnection(provider)
    if (!connection) return true

    loading.value = true
    error.value = null

    const result = await connectionsService.deleteConnection(connection.id)

    loading.value = false
    if (result.error) {
      error.value = result.error
      return false
    }

    connections.value = connections.value.filter((c) => c.id !== connection.id)
    return true
  }

  return {
    connections,
    loading,
    error,
    fetchConnections,
    getConnection,
    disconnect,
  }
}
