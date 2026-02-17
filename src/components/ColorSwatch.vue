<template>
  <div
    class="color-swatch"
    :class="{ 'color-swatch--wide': wide }"
    :style="{ backgroundColor: color }"
  >
    <span class="color-swatch__name" :style="{ color: textColor }">{{ name }}</span>
    <span class="color-swatch__code" :style="{ color: codeColor }">{{ color }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  color: string
  textColor?: string
  codeColor?: string
  wide?: boolean
}>()
</script>

<style scoped>
.color-swatch {
  aspect-ratio: 1;
  border: var(--border-width) solid var(--color-gray-200);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: var(--space-md);
  position: relative;
  overflow: hidden;
}

.color-swatch--wide {
  aspect-ratio: 16 / 9;
}

.color-swatch__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.color-swatch__code {
  font-size: var(--font-size-xs);
  font-family: monospace;
  margin-top: 4px;
}
</style>
