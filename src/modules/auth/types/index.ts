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

/** An OAuth client (e.g. Claude) asking to act as the user (#99). */
export interface OAuthAuthorizationRequest {
  authorizationId: string
  clientName: string
  clientUri: string | null
  redirectUri: string
  scopes: string[]
  userEmail: string
}

/** Details to show on the consent screen, or a redirect when consent was already given. */
export type OAuthAuthorizationState =
  | { kind: 'consent'; request: OAuthAuthorizationRequest }
  | { kind: 'redirect'; url: string }
