<template>
  <section class="planner" aria-labelledby="planner-title">
    <header class="planner__header">
      <div>
        <h2 id="planner-title" class="planner__title">Intentions</h2>
        <p class="planner__subtitle">{{ subtitle }}</p>
      </div>

      <div class="planner__switch" role="group" aria-label="Day">
        <button
          v-for="d in DAYS"
          :key="d.id"
          class="planner__switch-btn"
          :class="{ 'planner__switch-btn--active': dayOffset === d.offset }"
          type="button"
          :aria-pressed="dayOffset === d.offset"
          @click="dayOffset = d.offset"
        >
          {{ d.label }}
        </button>
      </div>
    </header>

    <div class="planner__tabs" role="tablist" aria-label="Scope">
      <button
        v-for="s in SCOPES"
        :key="s.id"
        class="planner__tab"
        :class="{ 'planner__tab--active': scope === s.id }"
        type="button"
        role="tab"
        :aria-selected="scope === s.id"
        @click="scope = s.id"
      >
        {{ s.label }}
        <span class="planner__tab-count">{{ listFor(s.id, day).length }}/{{ MAX }}</span>
      </button>
    </div>

    <p v-if="error" class="planner__error" role="alert">{{ error.message }}</p>

    <ol v-if="current.length > 0" class="planner__list">
      <IntentionItem
        v-for="intention in current"
        :key="intention.id"
        :intention="intention"
        @toggle="toggleDone"
        @remove="remove"
      />
    </ol>
    <p v-else class="planner__empty">{{ emptyText }}</p>

    <IntentionForm
      v-if="current.length < MAX"
      :key="`${scope}-${dayOffset}`"
      :suggestions="scope === 'personal' ? [] : suggestionsFor(scope, day)"
      :busy="busy"
      :placeholder="placeholder"
      @add="handleAdd"
    />
    <p v-else class="planner__full">All {{ MAX }} slots are set. Fewer, clearer intentions beat a long list.</p>

    <footer v-if="showWrapUp" class="planner__wrapup">
      <span class="planner__wrapup-text">
        {{ todayProgress.done }} of {{ todayProgress.total }} done today
      </span>
      <button class="planner__wrapup-btn" type="button" @click="planTomorrow">
        Plan tomorrow
        <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import IntentionItem from '@/modules/assistant/components/IntentionItem.vue'
import IntentionForm from '@/modules/assistant/components/IntentionForm.vue'
import { useIntentions, type NewIntention } from '@/modules/assistant/composables/useIntentions'
import { addDays, progress } from '@/modules/assistant/composables/intentionHelpers'
import { MAX_INTENTIONS_PER_SCOPE } from '@/modules/assistant/services/intentions.service'
import type { IntentionScope } from '@/modules/assistant/types'

const MAX = MAX_INTENTIONS_PER_SCOPE

const DAYS = [
  { id: 'today', label: 'Today', offset: 0 },
  { id: 'tomorrow', label: 'Tomorrow', offset: 1 },
] as const

const SCOPES: { id: IntentionScope; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'personal', label: 'Personal' },
]

const { error, loadTasks, listFor, suggestionsFor, add, toggleDone, remove } =
  useIntentions()

const scope = ref<IntentionScope>('day')
const dayOffset = ref<0 | 1>(0)
const busy = ref(false)

const day = computed(() => addDays(new Date(), dayOffset.value))
const current = computed(() => listFor(scope.value, day.value))
const todayProgress = computed(() => progress(listFor('day', new Date())))

const showWrapUp = computed(
  () => dayOffset.value === 0 && scope.value === 'day' && todayProgress.value.total > 0,
)

const subtitle = computed(() => {
  const label = day.value.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  if (scope.value === 'week') return `Week of ${label} — the 3 outcomes that would make this week a success.`
  if (scope.value === 'personal') return `${label} — 3 things for you outside work.`
  return `${label} — choose up to 3 things you want done by the end of the day.`
})

const emptyText = computed(() =>
  dayOffset.value === 1
    ? 'Nothing set for tomorrow yet. Deciding tonight makes the morning easier.'
    : 'No intentions yet. Start with the most consequential task.',
)

const placeholder = computed(() =>
  scope.value === 'personal' ? 'e.g. Dinner without phones' : 'What do you want done?',
)

// Intentions are loaded by IntentionsBar in the app layout; only tasks are needed here.
onMounted(async () => {
  await loadTasks()
})

async function handleAdd(input: NewIntention): Promise<void> {
  busy.value = true
  await add(scope.value, day.value, input)
  busy.value = false
}

function planTomorrow(): void {
  dayOffset.value = 1
}
</script>

<style scoped>
.planner {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.planner__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.planner__title {
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.planner__subtitle {
  margin-top: 2px;
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.planner__switch {
  display: flex;
  padding: 2px;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
}

.planner__switch-btn {
  padding: var(--space-xs) var(--space-md);
  border: none;
  border-radius: var(--radius-full);
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
  cursor: pointer;
}

.planner__switch-btn--active {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.planner__tabs {
  display: flex;
  gap: var(--space-xs);
  border-bottom: var(--border-width) solid var(--border-color);
}

.planner__tab {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: -1px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
  cursor: pointer;
}

.planner__tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.planner__tab-count {
  font-family: monospace;
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}

.planner__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}

.planner__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.planner__empty,
.planner__full {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.planner__wrapup {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding-top: var(--space-md);
  border-top: var(--border-width) solid var(--border-color);
}

.planner__wrapup-text {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.planner__wrapup-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  cursor: pointer;
  transition: border-color 0.15s;
}

.planner__wrapup-btn:hover {
  border-color: var(--color-primary);
}

.planner__wrapup-btn .material-symbols-outlined {
  font-size: 16px;
}
</style>
