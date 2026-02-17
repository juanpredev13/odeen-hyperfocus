# Issue #3 — Authentication Module

## Objective

Implement the full authentication flow using Supabase Auth, with protected routes and shared auth state.

## Reference

- `docs/requirements.md` — Section 2.1
- `supabase/migrations/20260217000001_create_schema.sql` — `profiles` table + trigger

---

## Steps

### 1. Auth service (`src/modules/auth/services/auth.service.ts`)

All Supabase Auth calls go here — never in components or views.

```ts
signUp(email: string, password: string): Promise<...>
signIn(email: string, password: string): Promise<...>
signOut(): Promise<...>
getSession(): Promise<...>
onAuthStateChange(callback): Unsubscribable
```

### 2. Auth composable (`src/modules/auth/composables/useAuth.ts`)

Reactive wrapper over the service. Exposes:

```ts
const { user, isAuthenticated, loading, error } = useAuth()
```

Restores session on page reload via `onAuthStateChange`.

### 3. Views

| View | Route | Purpose |
| ---- | ----- | ------- |
| `LoginView.vue` | `/login` | Email + password sign in |
| `RegisterView.vue` | `/register` | Email + password sign up |

### 4. Router guards

Protect all non-auth routes. Redirect unauthenticated users to `/login`. Redirect authenticated users away from `/login` and `/register`.

### 5. Types (`src/modules/auth/types/index.ts`)

```ts
interface AuthUser {
  id: string
  email: string
}

interface AuthError {
  message: string
}
```

---

## Acceptance Criteria

- [ ] User can register with email + password
- [ ] User can log in
- [ ] User can log out
- [ ] Session persists on page reload
- [ ] Unauthenticated users are redirected to `/login`
- [ ] No Supabase calls in components or views
- [ ] All types defined — no `any`
