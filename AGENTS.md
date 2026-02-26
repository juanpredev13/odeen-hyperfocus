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

### Project Config

- **Project ref:** `jpryskxhhoxphxfsbbux`
- **Project URL:** `https://jpryskxhhoxphxfsbbux.supabase.co`
- **CLI:** use `npx supabase` (not installed globally)
- **Migrations:** `supabase/migrations/` — run with `npx supabase db push`
- **Env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `.env` (never commit `.env`)

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

## Pull Request Template

All PRs must use this template. Fill in every applicable section.

- **Features/fixes** → Target: `main`

```markdown
# <TYPE>: <Short summary of the change>

## Description

Clearly explain what changed. Provide enough context for someone who did not work on the change to understand it quickly.

## Why?

Justify the change: the problem it solves, user impact, data or feedback.

## Screenshots (Before & After)

| Before | After |
|--------|-------|
| <img width="..." height="..." alt="before" src="..." /> | <img width="..." height="..." alt="after" src="..." /> |

## How to test

- Steps to reproduce/verify the change
- URLs/roles if applicable
- Edge cases to check

## Branch Information

- **Source Branch:** `feature-branch-name` / `hotfix-branch-name`
- **Target Branch:** `main`
```

## Security

- Never commit `.env` or Supabase service keys
- RLS must be enabled on every table
- Auth tokens handled exclusively through Supabase Auth SDK
- Validate all user input at the service layer

## GitHub CLI (`gh`)

Use `gh` (GitHub CLI) for all GitHub interactions — issues, PRs, actions, and repo queries. Never use the GitHub web UI when `gh` can do the job.

### Issues

```bash
# List open issues
gh issue list

# List issues by label
gh issue list --label "bug"
gh issue list --label "enhancement"

# View issue details
gh issue view <number>

# Create a new issue
gh issue create --title "<type>(scope): description" --body "Details..." --label "<label>"

# Close an issue with a comment
gh issue close <number> --comment "Resolved in #<PR>"

# Reopen an issue
gh issue reopen <number>

# Assign an issue
gh issue edit <number> --add-assignee @me
```

> Issue titles should follow the same Conventional Commits format: `feat(kanban): add drag support`, `bug(auth): session lost on refresh`.

### Pull Requests

```bash
# Create PR from current branch → main (interactive)
gh pr create --base main

# Create PR with all details
gh pr create --base main --title "feat(tasks): add energy level filter" --body "## Description\n\nAdds filtering by energy level.\n\n## How to test\n\n1. Go to Kanban view\n2. Click filter icon"

# List open PRs
gh pr list

# View PR details, diff, and checks
gh pr view <number>
gh pr diff <number>
gh pr checks <number>

# Review a PR
gh pr review <number> --approve
gh pr review <number> --request-changes --body "Fix X before merging"

# Merge PR (squash to keep clean history)
gh pr merge <number> --squash --delete-branch

# Checkout a PR locally for testing
gh pr checkout <number>
```

> Always use `--squash` when merging to keep a linear commit history on `main`.

### Actions / Workflows

```bash
# List workflow runs
gh run list

# View a specific run
gh run view <run-id>

# Watch a run in real time
gh run watch <run-id>

# View run logs
gh run view <run-id> --log

# Re-run a failed workflow
gh run rerun <run-id>

# List available workflows
gh workflow list

# Trigger a workflow manually
gh workflow run <workflow-name>
```

### Branching Workflow

Always create branches from issues when possible:

```bash
# Create a feature branch linked to an issue
git checkout main && git pull
git checkout -b feat/<issue-number>-<short-description>

# Example: issue #8 about focus mode
git checkout -b feat/8-focus-mode
```

Branch naming conventions:

| Prefix       | When to use                       |
| ------------ | --------------------------------- |
| `feat/`      | New features                      |
| `fix/`       | Bug fixes                         |
| `refactor/`  | Code restructuring                |
| `docs/`      | Documentation changes             |
| `chore/`     | Maintenance, config, tooling      |

### Quick Repo Queries

```bash
# View repo info
gh repo view

# Clone the repo (for new setups)
gh repo clone juanpredev13/odeen-hyperfocus

# View recent activity
gh api repos/{owner}/{repo}/events --jq '.[0:5] | .[].type'

# Search issues
gh issue list --search "kanban drag"
```

## Do NOT

- Add Tailwind or any CSS utility framework
- Use Options API — Composition API only
- Put business logic in components
- Create files outside the defined module structure
- Add features outside POC scope (see `docs/requirements.md` Section 8)
- Use `any`
- Skip error handling on Supabase calls
- Use npm or yarn — use pnpm
