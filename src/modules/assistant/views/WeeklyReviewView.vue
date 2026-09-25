<template>
  <div class="weekly-review">
    <header class="weekly-review__header">
      <h1 class="weekly-review__title">Weekly review</h1>
    </header>

    <AssistantNav />

    <section class="weekly-review__empty">
      <span class="material-symbols-outlined weekly-review__empty-icon">insights</span>
      <p class="weekly-review__empty-text">Your weekly review will show how much of your time was intentional, how long you focused, and how often you refocused.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import AssistantNav from '@/modules/assistant/components/AssistantNav.vue'
</script>

<style scoped>
.weekly-review {
  padding: var(--space-xl);
  max-width: 960px;
  overflow-y: auto;
  height: 100%;
}

.weekly-review__header {
  margin-bottom: var(--space-md);
}

.weekly-review__title {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-primary);
}

.weekly-review__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) var(--space-md);
  border: var(--border-width) dashed var(--border-color);
  border-radius: var(--radius-lg);
  text-align: center;
}

.weekly-review__empty-icon {
  font-size: var(--icon-size);
  color: var(--color-gray-400);
}

.weekly-review__empty-text {
  max-width: 360px;
  font-size: var(--font-size-sm);
  line-height: var(--leading-normal);
  color: var(--color-gray-500);
}
</style>
