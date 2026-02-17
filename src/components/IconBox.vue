<template>
  <div class="icon-box">
    <span class="material-symbols-outlined icon-box__icon">{{ name }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>

<style scoped>
.icon-box {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: var(--border-width) solid var(--color-gray-100);
  background-color: var(--color-surface);
  border-radius: var(--radius-sm);
  transition:
    border-color 0.3s,
    box-shadow 0.3s;
}

.icon-box:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg);
}

.icon-box__icon {
  font-size: var(--icon-size);
  color: var(--color-gray-400);
  transition: color 0.3s;
}

.icon-box:hover .icon-box__icon {
  color: var(--color-primary);
}
</style>
