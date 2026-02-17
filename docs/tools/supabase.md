# Supabase

## Project

| Key         | Value                                      |
| ----------- | ------------------------------------------ |
| Project ref | `jpryskxhhoxphxfsbbux`                     |
| Project URL | `https://jpryskxhhoxphxfsbbux.supabase.co` |
| Dashboard   | `https://supabase.com/dashboard/project/jpryskxhhoxphxfsbbux` |

## Environment Variables

Stored in `.env` (never committed). See `.env.example` for the template.

```
VITE_SUPABASE_URL=https://jpryskxhhoxphxfsbbux.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from dashboard>
```

> **Never add `SUPABASE_SERVICE_ROLE_KEY` to `.env`** — it bypasses RLS and must never be exposed client-side.

## CLI

The Supabase CLI is not installed globally. Use `npx`:

```bash
# Login (one-time, uses access token from supabase.com/dashboard/account/tokens)
npx supabase login --token <token>

# Link to the project (one-time per machine)
npx supabase link --project-ref jpryskxhhoxphxfsbbux

# Push migrations to remote
npx supabase db push

# Pull remote schema changes locally
npx supabase db pull
```

## Migrations

All SQL migrations live in `supabase/migrations/`. Files are prefixed with a timestamp and applied in order.

| File | Description |
| ---- | ----------- |
| `20260217000001_create_schema.sql` | Creates `task_status` enum and all 4 tables with constraints |
| `20260217000002_enable_rls.sql` | Enables RLS and writes policies scoped to `auth.uid()` |

To add a new migration:

```bash
npx supabase migration new <name>
# Edit the generated file in supabase/migrations/
npx supabase db push
```

## Schema

Four tables — see `docs/requirements.md` Section 4 for full column specs.

```
profiles          ← mirrors auth.users, auto-created on sign-up
projects          ← scoped to profiles.id
tasks             ← scoped to projects.id
task_connections  ← directed edges between tasks
```

## RLS Rules

All tables have RLS enabled. Access is always scoped to `auth.uid()`:

- `profiles` — user can only read/update their own row
- `projects` — user can only CRUD their own projects
- `tasks` — user can only CRUD tasks belonging to their projects
- `task_connections` — user can only CRUD connections between their own tasks
