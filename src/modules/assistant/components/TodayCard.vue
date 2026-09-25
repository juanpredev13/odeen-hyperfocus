<template>
  <section class="today-card">
    <header class="today-card__header">
      <span class="material-symbols-outlined today-card__icon">{{ icon }}</span>
      <h2 class="today-card__title">{{ title }}</h2>
      <span v-if="value !== undefined" class="today-card__value">{{ value }}</span>
    </header>

    <p class="today-card__text">{{ text }}</p>

    <span v-if="badge" class="today-card__badge">{{ badge }}</span>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  text: string
  value?: string | number
  badge?: string
}>()
</script>

<style scoped>
.today-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.today-card__header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.today-card__icon {
  font-size: var(--icon-size-lg);
  color: var(--color-primary);
}

.today-card__title {
  flex: 1;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.today-card__value {
  font-size: var(--font-size-h3);
  line-height: 1;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.today-card__text {
  font-size: var(--font-size-sm);
  line-height: var(--leading-normal);
  color: var(--color-gray-500);
}

.today-card__badge {
  align-self: flex-start;
  padding: 2px var(--space-sm);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-gray-400);
}
</style>
