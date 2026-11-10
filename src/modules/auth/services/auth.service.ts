import { supabase } from '@/services/supabase'
import type { AuthResult, AuthUser } from '@/modules/auth/types'
import type { AuthChangeEvent, Session, Subscription } from '@supabase/supabase-js'

export async function signUp(email: string, password: string): Promise<AuthResult<AuthUser>> {
  // The confirmation link returns to this app (localhost in dev, the deployed URL in production).
  // The origin must be in the Supabase Auth redirect allow-list (supabase/config.toml).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  })

  if (error) return { data: null, error: { message: error.message } }
  if (!data.user) return { data: null, error: { message: 'Sign up failed' } }

  return {
    data: { id: data.user.id, email: data.user.email ?? '' },
    error: null,
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult<AuthUser>> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { data: null, error: { message: error.message } }
  if (!data.user) return { data: null, error: { message: 'Sign in failed' } }

  return {
    data: { id: data.user.id, email: data.user.email ?? '' },
    error: null,
  }
}

export async function signOut(): Promise<AuthResult<null>> {
  const { error } = await supabase.auth.signOut()

  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}

// Email address shape check before calling Auth; the server validates again.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function requestPasswordReset(email: string): Promise<AuthResult<null>> {
  const address = email.trim()
  if (!EMAIL_PATTERN.test(address)) return { data: null, error: { message: 'Enter a valid email address' } }

  // The recovery link returns to /reset-password on this origin, which must be in the
  // Supabase Auth redirect allow-list (supabase/config.toml).
  const { error } = await supabase.auth.resetPasswordForEmail(address, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}

export async function updatePassword(password: string): Promise<AuthResult<null>> {
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { data: null, error: { message: error.message } }

  return { data: null, error: null }
}

export async function getSession(): Promise<AuthResult<AuthUser>> {
  const { data, error } = await supabase.auth.getSession()

  if (error) return { data: null, error: { message: error.message } }
  if (!data.session?.user) return { data: null, error: null }

  const user = data.session.user

  return {
    data: { id: user.id, email: user.email ?? '' },
    error: null,
  }
}

export function onAuthStateChange(
  callback: (user: AuthUser | null) => void,
): { subscription: Subscription } {
  const { data } = supabase.auth.onAuthStateChange(
    (_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        callback({ id: session.user.id, email: session.user.email ?? '' })
      } else {
        callback(null)
      }
    },
  )

  return data
}
