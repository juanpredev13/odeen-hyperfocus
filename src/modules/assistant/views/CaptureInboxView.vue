<template>
  <div class="capture-inbox">
    <header class="capture-inbox__header">
      <h1 class="capture-inbox__title">Inbox</h1>
    </header>

    <AssistantNav />

    <section class="capture-inbox__empty">
      <span class="material-symbols-outlined capture-inbox__empty-icon">inbox</span>
      <p class="capture-inbox__empty-text">Nothing captured yet. Distractions, open loops and ideas you capture during the day will show up here.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import AssistantNav from '@/modules/assistant/components/AssistantNav.vue'
</script>

<style scoped>
.capture-inbox {
  padding: var(--space-xl);
  max-width: 960px;
  overflow-y: auto;
  height: 100%;
}

.capture-inbox__header {
  margin-bottom: var(--space-md);
}

.capture-inbox__title {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-primary);
}

.capture-inbox__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) var(--space-md);
  border: var(--border-width) dashed var(--border-color);
  border-radius: var(--radius-lg);
  text-align: center;
}

.capture-inbox__empty-icon {
  font-size: var(--icon-size);
  color: var(--color-gray-400);
}

.capture-inbox__empty-text {
  max-width: 360px;
  font-size: var(--font-size-sm);
  line-height: var(--leading-normal);
  color: var(--color-gray-500);
}
</style>
