<template>
  <div class="intentions-bar" :class="{ 'intentions-bar--collapsed': collapsed }">
    <button
      v-if="collapsed"
      class="intentions-bar__summary"
      type="button"
      :aria-expanded="expanded"
      aria-controls="intentions-bar-list"
      @click="expanded = !expanded"
    >
      <span class="material-symbols-outlined" aria-hidden="true">flag</span>
      Intentions {{ stats.done }}/{{ stats.total }}
    </button>

    <template v-if="!collapsed || expanded">
      <span v-if="!collapsed" class="intentions-bar__label">
        <span class="material-symbols-outlined" aria-hidden="true">flag</span>
        Today
      </span>

      <ul v-if="today.length > 0" id="intentions-bar-list" class="intentions-bar__list" aria-label="Today's intentions">
        <li v-for="intention in today" :key="intention.id">
          <button
            class="intentions-bar__chip"
            :class="{ 'intentions-bar__chip--done': intention.done }"
            type="button"
            :aria-pressed="intention.done"
            :title="intention.done ? 'Mark as not done' : 'Mark as done'"
            @click="toggleDone(intention)"
          >
            <span class="material-symbols-outlined intentions-bar__icon" aria-hidden="true">
              {{ intention.done ? 'check_circle' : 'radio_button_unchecked' }}
            </span>
            <span class="intentions-bar__text">{{ intention.text }}</span>
          </button>
        </li>
      </ul>

      <RouterLink v-else id="intentions-bar-list" class="intentions-bar__empty" :to="{ name: 'assistant' }">
        No intentions for today. Choose your 3.
      </RouterLink>

      <RouterLink
        v-if="today.length > 0 && !collapsed"
        class="intentions-bar__plan"
        :to="{ name: 'assistant' }"
      >
        {{ stats.done }}/{{ stats.total }} · Plan
      </RouterLink>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useIntentions } from '@/modules/assistant/composables/useIntentions'
import { progress } from '@/modules/assistant/composables/intentionHelpers'

withDefaults(defineProps<{ collapsed?: boolean }>(), { collapsed: false })

const { load, listFor, toggleDone } = useIntentions()

const expanded = ref(false)

// listFor reads the shared `intentions` ref, so the bar updates with the planner.
const today = computed(() => listFor('day', new Date()))
const stats = computed(() => progress(today.value))

onMounted(async () => {
  await load()
})
</script>

<style scoped>
.intentions-bar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  border-bottom: var(--border-width) solid var(--border-color);
  background-color: var(--color-surface);
  min-height: 44px;
  flex-shrink: 0;
  overflow: hidden;
}

.intentions-bar--collapsed {
  position: relative;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-sm);
  padding: 0;
  border: none;
  background: none;
  min-height: 0;
  overflow: visible;
}

.intentions-bar__label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-gray-400);
}

.intentions-bar__label .material-symbols-outlined,
.intentions-bar__summary .material-symbols-outlined {
  font-size: 16px;
}

.intentions-bar__list {
  display: flex;
  gap: var(--space-sm);
  flex: 1;
  min-width: 0;
  overflow-x: auto;
}

.intentions-bar--collapsed .intentions-bar__list {
  flex-direction: column;
  align-items: flex-end;
}

.intentions-bar__chip {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  max-width: 280px;
  padding: var(--space-xs) var(--space-sm);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  cursor: pointer;
  transition: border-color 0.15s;
}

.intentions-bar__chip:hover {
  border-color: var(--color-primary);
}

.intentions-bar__chip--done {
  color: var(--color-gray-400);
}

.intentions-bar__chip--done .intentions-bar__text {
  text-decoration: line-through;
}

.intentions-bar__icon {
  font-size: 16px;
}

.intentions-bar__chip--done .intentions-bar__icon {
  color: var(--color-status-done-dot);
}

.intentions-bar__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.intentions-bar__empty,
.intentions-bar__plan {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  text-decoration: none;
  white-space: nowrap;
}

.intentions-bar__empty {
  flex: 1;
}

.intentions-bar__empty:hover,
.intentions-bar__plan:hover {
  color: var(--color-primary);
}

.intentions-bar__plan {
  flex-shrink: 0;
  font-family: monospace;
}

.intentions-bar__summary {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
  cursor: pointer;
}

.intentions-bar__summary:hover {
  color: var(--color-primary);
}
</style>
