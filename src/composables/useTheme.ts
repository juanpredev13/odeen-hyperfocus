import { ref, readonly } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'odeen-theme'

const theme = ref<Theme>('light')

function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

function applyTheme(value: Theme): void {
  document.documentElement.setAttribute('data-theme', value)
}

/** Must run once, as early as possible (before mount), to avoid a flash of the wrong theme. */
export function initTheme(): void {
  theme.value = resolveInitialTheme()
  applyTheme(theme.value)
}

export function useTheme() {
  function setTheme(value: Theme): void {
    theme.value = value
    localStorage.setItem(STORAGE_KEY, value)
    applyTheme(value)
  }

  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: readonly(theme),
    setTheme,
    toggleTheme,
  }
}
