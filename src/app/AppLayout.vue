<template>
  <div class="app-layout">
    <nav class="nav" aria-label="Main">
      <div class="nav__top">
        <div class="nav__logo">
          <span class="nav__logo-mark" aria-hidden="true">
            <span class="nav__logo-core"></span>
          </span>
          <span class="nav__logo-text">ODEEN</span>
          <span class="nav__logo-dot" aria-hidden="true"></span>
        </div>

        <ul class="nav__links">
          <li v-for="link in links" :key="link.to">
            <RouterLink
              class="nav__link"
              :class="{ 'nav__link--active': isActive(link) }"
              :to="link.to"
            >
              <span class="material-symbols-outlined nav__link-icon" aria-hidden="true">
                {{ link.icon }}
              </span>
              {{ link.label }}
            </RouterLink>
          </li>
        </ul>
      </div>

      <div class="nav__bottom">
        <button
          class="nav__action"
          :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleTheme"
        >
          <span class="material-symbols-outlined nav__link-icon" aria-hidden="true">
            {{ theme === 'dark' ? 'light_mode' : 'dark_mode' }}
          </span>
          {{ theme === 'dark' ? 'Light mode' : 'Dark mode' }}
        </button>
        <p v-if="user" class="nav__user">{{ user.email }}</p>
        <button class="nav__action" @click="handleSignOut">
          <span class="material-symbols-outlined nav__link-icon" aria-hidden="true">logout</span>
          Sign out
        </button>
      </div>
    </nav>

    <main class="app-layout__main">
      <IntentionsBar />
      <div class="app-layout__content">
        <RouterView />
      </div>
    </main>

    <nav class="tabbar" aria-label="Main (mobile)">
      <RouterLink
        v-for="link in tabLinks"
        :key="link.to"
        class="tabbar__link"
        :class="{ 'tabbar__link--active': isActive(link) }"
        :to="link.to"
      >
        <span class="material-symbols-outlined tabbar__icon" aria-hidden="true">{{ link.icon }}</span>
        {{ link.short }}
      </RouterLink>
      <button class="tabbar__link tabbar__link--action" @click="confirmSignOut">
        <span class="material-symbols-outlined tabbar__icon" aria-hidden="true">logout</span>
        Sign out
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/modules/auth/composables/useAuth'
import IntentionsBar from '@/modules/assistant/components/IntentionsBar.vue'
import { useTheme } from '@/composables/useTheme'

interface NavLink {
  to: string
  /** Path prefixes that also count as this section. */
  match: string[]
  label: string
  /** Tab bar label. Links without one only appear in the side nav. */
  short?: string
  icon: string
}

const links: NavLink[] = [
  { to: '/assistant', match: ['/assistant'], label: 'Today', short: 'Today', icon: 'bolt' },
  { to: '/', match: ['/project/'], label: 'Projects', short: 'Projects', icon: 'dashboard' },
  { to: '/tasks', match: [], label: 'Tasks', short: 'Tasks', icon: 'task_alt' },
  { to: '/design-system', match: [], label: 'Design System', icon: 'palette' },
]

const tabLinks = links.filter((link) => link.short !== undefined)

const route = useRoute()
const router = useRouter()

function isActive(link: NavLink): boolean {
  return route.path === link.to || link.match.some((prefix) => route.path.startsWith(prefix))
}
const { user, signOut } = useAuth()
const { theme, toggleTheme } = useTheme()

async function handleSignOut(): Promise<void> {
  await signOut()
  await router.push('/login')
}

// The tab bar button sits next to the navigation tabs, so a stray tap must not sign out.
async function confirmSignOut(): Promise<void> {
  if (!confirm('Sign out of ODEEN?')) return
  await handleSignOut()
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--color-background);
}

/* Nav */
.nav {
  width: 232px;
  flex-shrink: 0;
  border-right: var(--border-width) solid var(--border-color);
  background-color: var(--color-surface);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-md);
}

.nav__top {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.nav__logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0 var(--space-sm);
}

.nav__logo-mark {
  width: 28px;
  height: 28px;
  border: 2px solid var(--color-mint);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav__logo-core {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  background-color: var(--color-accent-strong);
}

.nav__logo-text {
  font-family: var(--font-display);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.02em;
  color: var(--color-primary);
}

.nav__logo-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-accent);
  box-shadow: var(--shadow-glow);
}

.nav__links {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.nav__link,
.nav__action {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px var(--space-md);
  border-radius: var(--radius-full);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-gray-500);
  text-decoration: none;
  transition:
    background-color 0.15s,
    color 0.15s;
}

.nav__link:hover,
.nav__action:hover {
  color: var(--color-primary);
  background-color: var(--color-gray-100);
}

.nav__link--active,
.nav__link--active:hover {
  color: var(--color-surface);
  background-color: var(--color-primary);
}

.nav__link-icon {
  font-size: var(--icon-size-sm);
}

/* Bottom */
.nav__bottom {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  border-top: var(--border-width) solid var(--border-color);
  padding-top: var(--space-md);
}

.nav__user {
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
  padding: var(--space-xs) var(--space-md);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav__action {
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

/* Main content */
.app-layout__main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-layout__content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Mobile tab bar */
.tabbar {
  display: none;
}

@media (max-width: 767px) {
  .app-layout {
    flex-direction: column;
  }

  .nav {
    display: none;
  }

  .tabbar {
    display: flex;
    flex-shrink: 0;
    justify-content: space-around;
    padding: var(--space-sm) var(--space-sm) calc(var(--space-sm) + env(safe-area-inset-bottom));
    border-top: var(--border-width) solid var(--border-color);
    background-color: var(--color-surface);
  }

  .tabbar__link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: var(--space-xs) var(--space-sm);
    font-family: var(--font-display);
    font-size: var(--font-size-xxs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--color-gray-500);
    text-decoration: none;
  }

  .tabbar__link--active {
    color: var(--color-accent-strong);
  }

  .tabbar__link--action {
    background: none;
    border: none;
    cursor: pointer;
  }

  .tabbar__icon {
    font-size: var(--icon-size);
  }
}
</style>
