<template>
  <div class="assistant">
    <header class="assistant__header">
      <p class="assistant__date">{{ today }}</p>
      <h1 class="assistant__title">Today.</h1>
    </header>

    <AssistantNav />

    <p v-if="error" class="assistant__error">{{ error.message }}</p>

    <div class="assistant__focus">
      <TodayHero :intentions="todayIntentions" :session-minutes="defaultSessionMinutes" />
      <IntentionSequence
        :intentions="todayIntentions"
        :current-id="currentIntention?.id ?? null"
        @toggle="toggleDone"
      />
    </div>

    <IntentionsPlanner class="assistant__planner" />

    <div class="assistant__grid">
      <TodayCard
        icon="inbox"
        title="Inbox"
        text="Distractions, open loops and ideas you captured, waiting to be processed."
        :value="inboxCount"
      >
        <RouterLink class="assistant__card-link" :to="{ name: 'assistant-inbox' }">
          {{ inboxCount > 0 ? 'Process inbox' : 'Open inbox' }}
          <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </RouterLink>
      </TodayCard>
      <CheckinCard />
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
import TodayHero from '@/modules/assistant/components/TodayHero.vue'
import IntentionSequence from '@/modules/assistant/components/IntentionSequence.vue'
import IntentionsPlanner from '@/modules/assistant/components/IntentionsPlanner.vue'
import CheckinCard from '@/modules/assistant/components/CheckinCard.vue'
import ConnectionCard from '@/modules/assistant/components/ConnectionCard.vue'
import {
  PROVIDERS,
  useAssistantConnections,
} from '@/modules/assistant/composables/useAssistantConnections'
import { useAssistantSettings } from '@/modules/assistant/composables/useAssistantSettings'
import { useCaptures } from '@/modules/assistant/composables/useCaptures'
import { useIntentions } from '@/modules/assistant/composables/useIntentions'
import type { Provider } from '@/modules/assistant/types'

const {
  loading: connectionsLoading,
  error: connectionsError,
  fetchConnections,
  getConnection,
  disconnect,
} = useAssistantConnections()
const { error: settingsError, fetchSettings, effectiveSettings } = useAssistantSettings()
const { inboxCount, load: loadCaptures } = useCaptures()

const today = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const error = computed(() => connectionsError.value ?? settingsError.value)
const defaultSessionMinutes = computed(() => effectiveSettings().default_session_minutes)
const { listFor, toggleDone } = useIntentions()

const todayIntentions = computed(() => listFor('day', new Date()))
const currentIntention = computed(() => todayIntentions.value.find((i) => !i.done) ?? null)

onMounted(async () => {
  await Promise.all([fetchConnections(), fetchSettings(), loadCaptures()])
})

async function handleDisconnect(provider: Provider): Promise<void> {
  await disconnect(provider)
}
</script>

<style scoped>
.assistant {
  padding: var(--space-xl);
  max-width: 1040px;
  overflow-y: auto;
  height: 100%;
}

.assistant__header {
  margin-bottom: var(--space-lg);
}

.assistant__date {
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--color-accent-strong);
}

.assistant__title {
  font-size: var(--font-size-h1);
  font-weight: var(--font-weight-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--color-primary);
}

.assistant__focus {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
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

.assistant__card-link {
  font-family: var(--font-display);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  align-self: flex-start;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  text-decoration: none;
}

.assistant__card-link:hover {
  text-decoration: underline;
}

.assistant__card-link .material-symbols-outlined {
  font-size: 16px;
}

.assistant__section-title {
  margin-bottom: var(--space-md);
  text-transform: uppercase;
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.assistant__connections {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

@media (max-width: 767px) {
  .assistant {
    padding: var(--space-lg) var(--space-md);
  }

  .assistant__title {
    font-size: var(--font-size-display-mobile);
  }
}
</style>
