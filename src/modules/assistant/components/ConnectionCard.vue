<template>
  <li class="connection-card" :class="{ 'connection-card--connected': connected }">
    <span class="material-symbols-outlined connection-card__icon">{{ provider.icon }}</span>

    <div class="connection-card__body">
      <span class="connection-card__name">{{ provider.label }}</span>
      <span class="connection-card__description">{{ provider.description }}</span>
    </div>

    <span class="connection-card__status">
      <span class="connection-card__dot" />
      {{ connected ? 'Connected' : 'Not connected' }}
    </span>

    <button
      v-if="connected"
      class="connection-card__btn"
      type="button"
      :disabled="busy"
      @click="emit('disconnect', provider.id)"
    >
      Disconnect
    </button>
    <button
      v-else
      class="connection-card__btn"
      type="button"
      disabled
      title="Integration not available yet"
    >
      Connect
    </button>
  </li>
</template>

<script setup lang="ts">
import type { Provider, ProviderInfo } from '@/modules/assistant/types'

defineProps<{
  provider: ProviderInfo
  connected: boolean
  busy: boolean
}>()

const emit = defineEmits<{
  disconnect: [provider: Provider]
}>()
</script>

<style scoped>
.connection-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.connection-card__icon {
  font-size: var(--icon-size);
  color: var(--color-gray-500);
}

.connection-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.connection-card__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.connection-card__description {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

.connection-card__status {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  white-space: nowrap;
}

.connection-card__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background-color: var(--color-status-neutral-dot);
}

.connection-card--connected .connection-card__dot {
  background-color: var(--color-status-done-dot);
}

.connection-card__btn {
  padding: var(--space-xs) var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  cursor: pointer;
  transition: border-color 0.15s;
}

.connection-card__btn:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.connection-card__btn:disabled {
  color: var(--color-gray-400);
  cursor: not-allowed;
}
</style>
