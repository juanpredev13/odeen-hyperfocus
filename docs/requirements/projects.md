# Issue #4 — Projects Module

## Status: Complete — PR #15

## Objective

Implement project management scoped to the authenticated user. Projects are the top-level container for tasks.

## Reference

- `docs/requirements.md` — Section 2.2
- `supabase/migrations/20260217000001_create_schema.sql` — `projects` table

---

## Implementation

### Files

| File | Purpose |
| ---- | ------- |
| `src/modules/projects/types/index.ts` | `Project`, `CreateProjectPayload`, `UpdateProjectPayload`, `ProjectsResult<T>` |
| `src/modules/projects/services/projects.service.ts` | All Supabase calls isolated |
| `src/modules/projects/composables/useProjects.ts` | Reactive state and actions |
| `src/modules/projects/views/ProjectsView.vue` | Full CRUD UI at `/` |
| `src/store/activeProject.ts` | Global active project singleton |

---

### Types (`src/modules/projects/types/index.ts`)

```ts
interface Project {
  id: string
  user_id: string
  name: string
  created_at: string
}

type CreateProjectPayload = Pick<Project, 'name'>
type UpdateProjectPayload = Pick<Project, 'id' | 'name'>

interface ProjectsResult<T> {
  data: T | null
  error: ProjectsError | null
}
```

---

### Projects service (`src/modules/projects/services/projects.service.ts`)

All Supabase calls isolated here — never called from components or views.

```ts
fetchProjects(): Promise<ProjectsResult<Project[]>>
createProject(payload: CreateProjectPayload): Promise<ProjectsResult<Project>>
updateProject(payload: UpdateProjectPayload): Promise<ProjectsResult<Project>>
deleteProject(id: string): Promise<ProjectsResult<null>>
```

RLS on `projects` table ensures each query is automatically scoped to `auth.uid()`.

---

### Active project store (`src/store/activeProject.ts`)

Module-level singleton — shared across all modules (tasks, kanban, graph).

```ts
const { activeProject, setActiveProject, clearActiveProject } = useActiveProject()
```

- `activeProject` — `Ref<Project | null>`
- Auto-selected to the first project on `fetchProjects`
- Cleared when the active project is deleted and no others remain

---

### Projects composable (`src/modules/projects/composables/useProjects.ts`)

```ts
const {
  projects,
  activeProject,
  loading,
  error,
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  selectProject,
} = useProjects()
```

- `projects` — `Ref<Project[]>` — module-level, shared across callers
- `createProject(name)` — prepends new project and sets it as active
- `updateProject(id, name)` — updates list and active project if affected
- `deleteProject(id)` — removes from list, auto-selects next project or clears
- `selectProject(project)` — sets active project

---

### ProjectsView (`src/modules/projects/views/ProjectsView.vue`)

Route: `/`

Features:
- Header with "New project" button
- Inline create form — auto-focuses input on open
- Project list — sorted by `created_at DESC`
- Active project highlighted with black border
- Hover reveals edit and delete action buttons
- Inline name editing — confirm with Enter or ✓, cancel with Escape or ✕
- Delete with `window.confirm` guard
- Empty state message when no projects exist

---

## Acceptance Criteria

- [x] User can create a project
- [x] User can edit a project name inline
- [x] User can delete a project
- [x] Projects list only shows the authenticated user's projects (RLS)
- [x] Active project selection is shared across modules via store
- [x] No Supabase calls outside the service layer
- [x] All types defined — no `any`
