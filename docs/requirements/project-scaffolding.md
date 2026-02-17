# Issue #1 — Project Scaffolding: Vue 3 + TypeScript + Vite

## Objective

Initialize the ODEEN project with the defined technical stack and folder structure, ready for feature development.

## Reference

- `docs/requirements.md` — Sections 1, 3.1, 3.2, 5

---

## Steps

### 1. Scaffold Vue 3 + Vite project

```bash
pnpm create vite odeen-app --template vue-ts
```

- Use Vue 3 with TypeScript template
- Project name: `odeen-app` (or root-level scaffold)
- Ensure `pnpm` is used as the package manager

### 2. Enable TypeScript strict mode

In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 3. Configure ESLint + Prettier

Install dependencies:

```bash
pnpm add -D eslint prettier eslint-plugin-vue @vue/eslint-config-typescript @vue/eslint-config-prettier
```

ESLint config should enforce:

- Vue 3 recommended rules
- TypeScript strict rules
- No `any` usage
- Prettier integration for formatting

Prettier config (`.prettierrc`):

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### 4. Set up path aliases

In `vite.config.ts`:

```ts
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
```

In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Supported alias paths:

- `@/modules/...`
- `@/services/...`
- `@/composables/...`
- `@/router/...`
- `@/store/...`
- `@/styles/...`

### 5. Create modular folder structure

```
src/
├── app/                  # App shell, root layout
├── modules/
│   ├── auth/
│   │   ├── views/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── services/
│   │   └── types/
│   ├── projects/
│   │   ├── views/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── services/
│   │   └── types/
│   ├── tasks/
│   │   ├── views/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── services/
│   │   └── types/
│   ├── kanban/
│   │   ├── views/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── services/
│   │   └── types/
│   ├── graph/
│   │   ├── views/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── services/
│   │   └── types/
│   └── focus/
│       ├── views/
│       ├── components/
│       ├── composables/
│       ├── services/
│       └── types/
├── services/             # Shared services (Supabase client, etc.)
├── composables/          # Shared composables
├── router/               # Vue Router config
├── store/                # Global state
├── styles/               # Global CSS variables, resets, BEM base
└── types/                # Shared TypeScript types
```

### 6. Configure BEM-based CSS structure

Create global style files in `src/styles/`:

| File            | Purpose                                         |
| --------------- | ----------------------------------------------- |
| `variables.css` | Design tokens (colors, spacing, radii, shadows) |
| `reset.css`     | CSS reset / normalize                           |
| `base.css`      | Global base styles, typography                  |

Design tokens from the design system:

```css
:root {
  /* Colors */
  --color-primary: #111111;
  --color-surface: #ffffff;
  --color-background: #f9fafb;
  --color-status-active: #f3e8ff;
  --color-status-focus: #e0f2fe;
  --color-status-done: #dcfce7;

  /* Typography */
  --font-family: 'Inter', sans-serif;
  --font-size-h1: 64px;
  --font-size-h2: 32px;
  --font-size-h3: 20px;
  --font-size-body: 16px;

  /* Spacing (4px base unit) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 32px;
  --space-xl: 64px;

  /* Borders & Radii */
  --radius-md: 12px;
  --radius-lg: 16px;
  --border-color: #e5e7eb;
  --border-width: 1px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
}
```

### 7. Add Supabase client dependency

```bash
pnpm add @supabase/supabase-js
```

Create the Supabase client in `src/services/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Create `.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Acceptance Criteria

- [ ] Project runs with `pnpm dev`
- [ ] TypeScript strict mode enabled, no `any` allowed
- [ ] ESLint + Prettier configured and passing
- [ ] Path aliases resolve correctly (`@/modules/...`)
- [ ] All module folders created with internal structure
- [ ] Global CSS variables defined in `src/styles/`
- [ ] Supabase client configured and importable
- [ ] No Tailwind or utility CSS frameworks installed
