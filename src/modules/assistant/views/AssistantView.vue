<template>
  <div class="assistant">
    <header class="assistant__header">
      <p class="assistant__date">{{ today }}</p>
      <h1 class="assistant__title">Today</h1>
    </header>

    <AssistantNav />

    <p v-if="error" class="assistant__error">{{ error.message }}</p>

    <IntentionsPlanner class="assistant__planner" />

    <div class="assistant__grid">
      <TodayCard
        icon="timer"
        title="Next focus session"
        :text="`One task, no distractions. Default length: ${defaultSessionMinutes} min.`"
        badge="Coming soon"
      />
      <TodayCard
        icon="inbox"
        title="Inbox"
        text="Distractions, open loops and ideas you captured, waiting to be processed."
        :value="0"
        badge="Coming soon"
      />
    </div>

    <section class="assistant__section">
      <h2 class="assistant__section-title">Connections</h2>
      <ul class="assistant__connections">
        <ConnectionCard
          v-for="provider in PROVIDERS"
          :key="provider.id"
          :provider="provider"
          :connected="getConnection(provider.id) !== undefined"
          :busy="connectionsLoading"
          @disconnect="handleDisconnect"
        />
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AssistantNav from '@/modules/assistant/components/AssistantNav.vue'
import TodayCard from '@/modules/assistant/components/TodayCard.vue'
import IntentionsPlanner from '@/modules/assistant/components/IntentionsPlanner.vue'
import ConnectionCard from '@/modules/assistant/components/ConnectionCard.vue'
import {
  PROVIDERS,
  useAssistantConnections,
} from '@/modules/assistant/composables/useAssistantConnections'
import { useAssistantSettings } from '@/modules/assistant/composables/useAssistantSettings'
import type { Provider } from '@/modules/assistant/types'

const {
  loading: connectionsLoading,
  error: connectionsError,
  fetchConnections,
  getConnection,
  disconnect,
} = useAssistantConnections()
const { error: settingsError, fetchSettings, effectiveSettings } = useAssistantSettings()

const today = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const error = computed(() => connectionsError.value ?? settingsError.value)
const defaultSessionMinutes = computed(() => effectiveSettings().default_session_minutes)

onMounted(async () => {
  await Promise.all([fetchConnections(), fetchSettings()])
})

async function handleDisconnect(provider: Provider): Promise<void> {
  await disconnect(provider)
}
</script>

<style scoped>
.assistant {
  padding: var(--space-xl);
  max-width: 960px;
  overflow-y: auto;
  height: 100%;
}

.assistant__header {
  margin-bottom: var(--space-md);
}

.assistant__date {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-gray-400);
}

.assistant__title {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-primary);
}

.assistant__error {
  margin-bottom: var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
}

.assistant__planner {
  margin-bottom: var(--space-md);
}

.assistant__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.assistant__section-title {
  margin-bottom: var(--space-md);
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.assistant__connections {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
