<template>
  <nav class="assistant-nav" aria-label="Assistant sections">
    <RouterLink
      v-for="link in links"
      :key="link.name"
      class="assistant-nav__link"
      :to="{ name: link.name }"
      exact-active-class="assistant-nav__link--active"
    >
      <span class="material-symbols-outlined assistant-nav__icon">{{ link.icon }}</span>
      {{ link.label }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
interface AssistantNavLink {
  name: string
  label: string
  icon: string
}

const links: AssistantNavLink[] = [
  { name: 'assistant', label: 'Today', icon: 'today' },
  { name: 'assistant-inbox', label: 'Inbox', icon: 'inbox' },
  { name: 'assistant-review', label: 'Weekly review', icon: 'insights' },
]
</script>

<style scoped>
.assistant-nav {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-lg);
  border-bottom: var(--border-width) solid var(--border-color);
  padding-bottom: var(--space-sm);
}

.assistant-nav__link {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
  text-decoration: none;
  transition: all 0.15s;
}

.assistant-nav__link:hover {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.assistant-nav__link--active {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.assistant-nav__icon {
  font-size: var(--icon-size-sm);
}
</style>
