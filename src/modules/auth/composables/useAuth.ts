import { ref, computed } from 'vue'
import * as authService from '@/modules/auth/services/auth.service'
import type { AuthUser, AuthError } from '@/modules/auth/types'

const user = ref<AuthUser | null>(null)
const loading = ref(false)
const error = ref<AuthError | null>(null)

// Bootstrap session once at module level
let initialized = false

function initSession(): void {
  if (initialized) return
  initialized = true

  authService.getSession().then((result) => {
    user.value = result.data
  })

  const { subscription } = authService.onAuthStateChange((authUser) => {
    user.value = authUser
  })

  // Clean up on app teardown (HMR / test environments)
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      subscription.unsubscribe()
      initialized = false
    })
  }
}

initSession()

export function useAuth() {
  const isAuthenticated = computed(() => user.value !== null)

  async function signUp(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null

    const result = await authService.signUp(email, password)

    loading.value = false
    if (result.error) {
      error.value = result.error
      return false
    }

    user.value = result.data
    return true
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null

    const result = await authService.signIn(email, password)

    loading.value = false
    if (result.error) {
      error.value = result.error
      return false
    }

    user.value = result.data
    return true
  }

  async function signOut(): Promise<void> {
    loading.value = true
    error.value = null

    const result = await authService.signOut()

    loading.value = false
    if (result.error) {
      error.value = result.error
      return
    }

    user.value = null
  }

  function clearError(): void {
    error.value = null
  }

  return {
    user,
    isAuthenticated,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    clearError,
  }
}
