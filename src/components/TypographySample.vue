<template>
  <div class="typography-sample">
    <div class="typography-sample__meta">
      <span class="typography-sample__specs">{{ specs }}</span>
      <span class="typography-sample__tag">{{ tag }}</span>
    </div>
    <component :is="element" class="typography-sample__text" :class="textClass">
      <slot />
    </component>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  specs: string
  tag: string
  element: 'h1' | 'h2' | 'h3' | 'p'
  textClass?: string
}>()
</script>

<style scoped>
.typography-sample__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
  border-bottom: var(--border-width) solid var(--border-color);
  padding-bottom: var(--space-sm);
}

.typography-sample__specs {
  font-size: var(--font-size-xs);
  font-family: monospace;
  color: var(--color-gray-400);
}

.typography-sample__tag {
  font-size: var(--font-size-xxs);
  font-family: monospace;
  color: var(--color-primary);
  background-color: var(--color-gray-100);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.typography-sample__text--body {
  color: var(--color-gray-600);
  line-height: var(--leading-relaxed);
  max-width: 640px;
}
</style>
