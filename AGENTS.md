# ODEEN — Hyperfocus

ODEEN is a minimalist deep work operating system. POC phase only — no AI, analytics, collaboration, or advanced metrics.

Full spec: `docs/requirements.md`

## Tech Stack

- **Frontend:** Vue 3 (Composition API) + TypeScript (strict) + Vite
- **Backend:** Supabase (Auth, PostgreSQL, RLS)
- **Styling:** CSS3 only — no Tailwind, no utility frameworks
- **Methodology:** BEM naming convention
- **Package manager:** pnpm

## Setup

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

## Architecture

All feature code lives inside `src/modules/{module}/`. Each module is self-contained:

```
src/modules/auth/
├── views/
├── components/
├── composables/
├── services/
└── types/
```

Shared code goes in `src/services/`, `src/composables/`, or `src/store/`.

### Separation of Concerns

- **Views** — route-level page components only
- **Components** — reusable UI pieces, no direct Supabase calls
- **Services** — all Supabase/API logic lives here, never in components
- **Composables** — shared reactive state and logic
- **Store** — global app state

### Imports

- Use path aliases (`@/modules/...`, `@/services/...`)
- Never use relative imports that go up more than one level (`../../`)

## Code Style

### TypeScript

- Strict mode is mandatory
- Never use `any` — use `unknown` and narrow, or define proper types
- All function parameters and return types must be typed
- Interfaces for data models go in `types/` inside each module
- Shared types go in `src/types/`

### CSS / BEM

- One scoped `<style>` block per component
- BEM naming: `.block`, `.block__element`, `.block--modifier`
- No utility classes, no inline styles
- Design tokens:
  - White background, black primary text
  - Thin borders, large whitespace
  - Rounded corners: 12–16px
  - Minimal shadows, no gradients, no heavy color accents
- Global variables defined in `src/styles/`

## Supabase

- All database calls go through service files (`src/services/` or `module/services/`)
- Never call Supabase directly from components or views
- Always handle errors — return typed results, never swallow errors silently
- RLS is enabled on all tables — never bypass it

## Database Schema (POC)

Four tables: `profiles`, `projects`, `tasks`, `task_connections`. See `docs/requirements.md` Section 4 for full schema.

Key constraints:

- All IDs are UUIDs
- `tasks.status` is enum: `todo | doing | done`
- `tasks.energy_level` range: 1–3
- `tasks.impact_score` range: 1–5
- `tasks.position_x` and `position_y` are nullable (only used in graph view)
- Max 3 tasks in `doing` status per project (enforced in UI)

## Performance

- Lazy load all route views
- Code split per route
- Graph module loads only when accessed
- Avoid unnecessary re-renders — use `computed` and `shallowRef` where appropriate
- Keep drag interactions under 16ms frame budget

## Commits

All commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>[optional scope]: <description>
```

| Type       | When to use                                    |
| ---------- | ---------------------------------------------- |
| `feat`     | A new feature                                  |
| `fix`      | A bug fix                                      |
| `docs`     | Documentation only changes                     |
| `style`    | CSS, formatting, missing semicolons (no logic) |
| `refactor` | Code change that neither fixes nor adds        |
| `perf`     | Performance improvement                        |
| `test`     | Adding or correcting tests                     |
| `build`    | Build system or external dependencies          |
| `ci`       | CI configuration                               |
| `chore`    | Maintenance tasks, tooling, configs            |

Scopes: `auth`, `projects`, `tasks`, `kanban`, `graph`, `focus`, `ui`, `db`.

```
feat(kanban): add drag-and-drop between columns
fix(auth): persist session on page reload
docs: add POC requirements document
style(ui): apply BEM naming to task card
refactor(tasks): extract service layer from component
chore: configure ESLint and Prettier
```

Breaking changes: append `!` after type/scope — `feat(db)!: rename status enum values`

### General

- Branch from `main`
- One concern per commit
- Never commit `.env`, credentials, or Supabase keys
- Reference issue numbers when applicable (`#1`, `#2`, etc.)

## Security

- Never commit `.env` or Supabase service keys
- RLS must be enabled on every table
- Auth tokens handled exclusively through Supabase Auth SDK
- Validate all user input at the service layer

## Do NOT

- Add Tailwind or any CSS utility framework
- Use Options API — Composition API only
- Put business logic in components
- Create files outside the defined module structure
- Add features outside POC scope (see `docs/requirements.md` Section 8)
- Use `any`
- Skip error handling on Supabase calls
- Use npm or yarn — use pnpm
