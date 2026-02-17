<template>
  <div class="section-header">
    <span class="material-symbols-outlined section-header__icon">{{ icon }}</span>
    <h2 class="section-header__title">{{ title }}</h2>
    <span v-if="meta" class="section-header__meta">{{ meta }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  meta?: string
}>()
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  border-bottom: var(--border-width) solid var(--border-color);
  padding-bottom: var(--space-md);
}

.section-header__icon {
  font-size: var(--icon-size-lg);
  color: var(--color-primary);
}

.section-header__title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-primary);
}

.section-header__meta {
  margin-left: auto;
  font-size: var(--font-size-xxs);
  font-family: monospace;
  color: var(--color-gray-400);
}
</style>
