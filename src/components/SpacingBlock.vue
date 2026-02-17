<template>
  <div class="spacing-block">
    <div class="spacing-block__visual" :style="{ height: height, width: width }">
      <span class="spacing-block__value">{{ size }}</span>
    </div>
    <div class="spacing-block__info">
      <p class="spacing-block__label">{{ label }}</p>
      <p class="spacing-block__description">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  size: string
  height: string
  width: string
  label: string
  description: string
}>()
</script>

<style scoped>
.spacing-block {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-lg);
}

.spacing-block__visual {
  background-color: var(--color-surface);
  border: var(--border-width) dashed var(--color-gray-300);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}

.spacing-block__value {
  font-size: var(--font-size-xs);
  font-family: monospace;
  color: var(--color-gray-500);
}

.spacing-block__info {
  text-align: right;
  flex-shrink: 0;
  width: 128px;
}

.spacing-block__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.spacing-block__description {
  font-size: var(--font-size-xxs);
  color: var(--color-gray-400);
  margin-top: 4px;
}
</style>
