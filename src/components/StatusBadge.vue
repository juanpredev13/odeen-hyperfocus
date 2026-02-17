<template>
  <div class="status-badge" :class="`status-badge--${variant}`">
    <span class="status-badge__dot"></span>
    <span class="status-badge__label">{{ label }}</span>
    <span v-if="code" class="status-badge__code">{{ code }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  variant: 'active' | 'focus' | 'done' | 'neutral'
  label: string
  code?: string
}>()
</script>

<style scoped>
.status-badge {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  aspect-ratio: 1;
  padding: var(--space-sm);
  border: var(--border-width) solid var(--border-color);
  transition: border-color 0.2s;
}

.status-badge:hover {
  border-color: var(--color-gray-300);
}

.status-badge__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}

.status-badge__label {
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge__code {
  font-size: 9px;
  font-family: monospace;
}

/* Variants */
.status-badge--active {
  background-color: var(--color-status-active);
  border-color: #e9d5ff;
}

.status-badge--active .status-badge__dot {
  background-color: var(--color-status-active-dot);
}

.status-badge--active .status-badge__label {
  color: var(--color-status-active-text);
}

.status-badge--active .status-badge__code {
  color: #c084fc;
}

.status-badge--focus {
  background-color: var(--color-status-focus);
  border-color: #bae6fd;
}

.status-badge--focus .status-badge__dot {
  background-color: var(--color-status-focus-dot);
}

.status-badge--focus .status-badge__label {
  color: var(--color-status-focus-text);
}

.status-badge--focus .status-badge__code {
  color: #60a5fa;
}

.status-badge--done {
  background-color: var(--color-status-done);
  border-color: #bbf7d0;
}

.status-badge--done .status-badge__dot {
  background-color: var(--color-status-done-dot);
}

.status-badge--done .status-badge__label {
  color: var(--color-status-done-text);
}

.status-badge--done .status-badge__code {
  color: #4ade80;
}

.status-badge--neutral {
  background-color: var(--color-status-neutral);
  border-color: var(--color-gray-100);
}

.status-badge--neutral .status-badge__dot {
  background-color: var(--color-status-neutral-dot);
}

.status-badge--neutral .status-badge__label {
  color: var(--color-status-neutral-text);
}

.status-badge--neutral .status-badge__code {
  color: var(--color-gray-400);
}
</style>
