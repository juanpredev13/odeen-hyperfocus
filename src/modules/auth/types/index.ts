export interface AuthUser {
  id: string
  email: string
}

export interface AuthError {
  message: string
}

export interface AuthResult<T> {
  data: T | null
  error: AuthError | null
}
