# Issue #3 — Authentication Module

## Status: Complete — PR #14

## Objective

Implement the full authentication flow using Supabase Auth, with protected routes and shared auth state.

## Reference

- `docs/requirements.md` — Section 2.1
- `supabase/migrations/20260217000001_create_schema.sql` — `profiles` table + trigger

---

## Implementation

### Files

| File | Purpose |
| ---- | ------- |
| `src/modules/auth/types/index.ts` | `AuthUser`, `AuthError`, `AuthResult<T>` |
| `src/modules/auth/services/auth.service.ts` | All Supabase Auth calls |
| `src/modules/auth/composables/useAuth.ts` | Shared reactive auth state |
| `src/modules/auth/views/LoginView.vue` | `/login` — sign in form |
| `src/modules/auth/views/RegisterView.vue` | `/register` — register form |
| `src/app/AppLayout.vue` | App shell with left nav and sign out button |
| `src/router/index.ts` | Route definitions and navigation guard |

---

### Types (`src/modules/auth/types/index.ts`)

```ts
interface AuthUser {
  id: string
  email: string
}

interface AuthError {
  message: string
}

interface AuthResult<T> {
  data: T | null
  error: AuthError | null
}
```

---

### Auth service (`src/modules/auth/services/auth.service.ts`)

All Supabase Auth calls are isolated here — never called from components or views.

```ts
signUp(email, password): Promise<AuthResult<AuthUser>>
signIn(email, password): Promise<AuthResult<AuthUser>>
signOut(): Promise<AuthResult<null>>
getSession(): Promise<AuthResult<AuthUser>>
onAuthStateChange(callback): { subscription: Subscription }
```

---

### Auth composable (`src/modules/auth/composables/useAuth.ts`)

Module-level singleton — session is bootstrapped once on import and shared across all callers.

```ts
const { user, isAuthenticated, loading, error, signUp, signIn, signOut, clearError } = useAuth()
```

- `user` — `Ref<AuthUser | null>`
- `isAuthenticated` — `ComputedRef<boolean>`
- `loading` — `Ref<boolean>`
- `error` — `Ref<AuthError | null>`
- Session restored on page reload via `onAuthStateChange`
- HMR-safe: subscription is cleaned up via `import.meta.hot.dispose`

---

### Router (`src/router/index.ts`)

**Route layout:**
- Auth routes (`/login`, `/register`) — `meta: { public: true }`, no nav, full-screen
- Protected routes (`/`, `/design-system`, …) — nested under `AppLayout`, always have the nav

**Navigation guard:**
```
unauthenticated + private route  → redirect to /login
authenticated   + public route   → redirect to /
```

---

### App layout (`src/app/AppLayout.vue`)

Left nav (220px) always visible on protected routes:

- ODEEN logo mark
- Nav links with `router-link-active` highlight
- User email (monospace, truncated)
- Sign out button — calls `signOut()` then navigates to `/login`

---

## Acceptance Criteria

- [x] User can register with email + password
- [x] User can log in
- [x] User can log out
- [x] Session persists on page reload
- [x] Unauthenticated users are redirected to `/login`
- [x] Authenticated users visiting `/login` or `/register` are redirected to `/`
- [x] No Supabase calls in components or views
- [x] All types defined — no `any`
