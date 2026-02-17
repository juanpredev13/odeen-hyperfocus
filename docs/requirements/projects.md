# Issue #4 — Projects Module

## Objective

Implement project management scoped to the authenticated user. Projects are the top-level container for tasks.

## Reference

- `docs/requirements.md` — Section 2.2
- `supabase/migrations/20260217000001_create_schema.sql` — `projects` table

---

## Steps

### 1. Types (`src/modules/projects/types/index.ts`)

```ts
interface Project {
  id: string
  user_id: string
  name: string
  created_at: string
}

type CreateProjectPayload = Pick<Project, 'name'>
type UpdateProjectPayload = Pick<Project, 'id' | 'name'>
```

### 2. Projects service (`src/modules/projects/services/projects.service.ts`)

```ts
fetchProjects(): Promise<Project[]>
createProject(payload: CreateProjectPayload): Promise<Project>
updateProject(payload: UpdateProjectPayload): Promise<Project>
deleteProject(id: string): Promise<void>
```

### 3. Projects composable (`src/modules/projects/composables/useProjects.ts`)

```ts
const { projects, loading, error, createProject, updateProject, deleteProject } = useProjects()
```

### 4. View (`src/modules/projects/views/ProjectsView.vue`)

- List all projects for the authenticated user
- Create new project (inline or modal)
- Edit project name inline
- Delete project with confirmation
- Select active project (persisted in store)

### 5. Store (`src/store/`)

Global state for the active project — used by tasks, kanban, and graph modules.

---

## Acceptance Criteria

- [ ] User can create a project
- [ ] User can edit a project name
- [ ] User can delete a project
- [ ] Projects list only shows the authenticated user's projects
- [ ] Active project selection is shared across modules
- [ ] No Supabase calls outside the service layer
- [ ] All types defined — no `any`
