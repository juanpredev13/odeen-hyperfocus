<template>
  <div class="app-layout">
    <nav class="nav">
      <div class="nav__top">
        <div class="nav__logo">
          <span class="nav__logo-mark">O</span>
          <span class="nav__logo-text">ODEEN</span>
        </div>

        <ul class="nav__links">
          <li>
            <RouterLink class="nav__link" to="/">
              <span class="material-symbols-outlined nav__link-icon">dashboard</span>
              Projects
            </RouterLink>
          </li>
          <li>
            <RouterLink class="nav__link" to="/tasks">
              <span class="material-symbols-outlined nav__link-icon">task_alt</span>
              Tasks
            </RouterLink>
          </li>
          <li>
            <RouterLink class="nav__link" to="/design-system">
              <span class="material-symbols-outlined nav__link-icon">palette</span>
              Design System
            </RouterLink>
          </li>
        </ul>
      </div>

      <div class="nav__bottom">
        <p v-if="user" class="nav__user">{{ user.email }}</p>
        <button class="nav__signout" @click="handleSignOut">
          <span class="material-symbols-outlined nav__link-icon">logout</span>
          Sign out
        </button>
      </div>
    </nav>

    <main class="app-layout__main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuth } from '@/modules/auth/composables/useAuth'

const router = useRouter()
const { user, signOut } = useAuth()

async function handleSignOut(): Promise<void> {
  await signOut()
  await router.push('/login')
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* Nav */
.nav {
  width: 220px;
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
  gap: var(--space-lg);
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
  border-radius: var(--radius-sm);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav__logo-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.05em;
  color: var(--color-primary);
}

.nav__links {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.nav__link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-sm);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
  text-decoration: none;
  transition: all 0.15s;
}

.nav__link:hover {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.nav__link.router-link-active {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.nav__link-icon {
  font-size: var(--icon-size-sm);
}

/* Bottom */
.nav__bottom {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border-top: var(--border-width) solid var(--border-color);
  padding-top: var(--space-md);
}

.nav__user {
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
  font-family: monospace;
  padding: 0 var(--space-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav__signout {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-sm);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all 0.15s;
}

.nav__signout:hover {
  color: var(--color-primary);
  background-color: var(--color-background);
}

/* Main content */
.app-layout__main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
