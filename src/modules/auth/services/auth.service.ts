import { supabase } from '@/services/supabase'
import type { AuthResult, AuthUser } from '@/modules/auth/types'
import type { AuthChangeEvent, Session, Subscription } from '@supabase/supabase-js'

export async function signUp(email: string, password: string): Promise<AuthResult<AuthUser>> {
  const { data, error } = await supabase.auth.signUp({ email, password })

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
