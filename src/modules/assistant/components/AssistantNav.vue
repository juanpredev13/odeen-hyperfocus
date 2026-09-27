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
  { name: 'assistant-close', label: 'Close the day', icon: 'bedtime' },
]
</script>

<style scoped>
.assistant-nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-xs) var(--space-lg);
  margin-bottom: var(--space-lg);
}

.assistant-nav__link {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) 0;
  border-bottom: 2px solid transparent;
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
  text-decoration: none;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.assistant-nav__link:hover {
  color: var(--color-primary);
}

.assistant-nav__link--active {
  color: var(--color-accent-strong);
  border-bottom-color: var(--color-accent);
}

:root[data-theme='dark'] .assistant-nav__link--active {
  color: var(--color-accent);
}

.assistant-nav__icon {
  font-size: var(--icon-size-sm);
}
</style>
