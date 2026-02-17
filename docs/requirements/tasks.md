# Issue #5 — Tasks Module

## Objective

Implement task management with status tracking, energy levels, and impact scores. Tasks are the core data unit used by Kanban, Graph, and Focus modules.

## Reference

- `docs/requirements.md` — Section 2.3
- `supabase/migrations/20260217000001_create_schema.sql` — `tasks` table

---

## Steps

### 1. Types (`src/modules/tasks/types/index.ts`)

```ts
type TaskStatus = 'todo' | 'doing' | 'done'

interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  energy_level: 1 | 2 | 3
  impact_score: 1 | 2 | 3 | 4 | 5
  position_x: number | null
  position_y: number | null
  created_at: string
}

type CreateTaskPayload = Pick<Task, 'project_id' | 'title' | 'description' | 'status' | 'energy_level' | 'impact_score'>
type UpdateTaskPayload = Partial<Omit<Task, 'id' | 'project_id' | 'created_at'>> & { id: string }
```

### 2. Tasks service (`src/modules/tasks/services/tasks.service.ts`)

```ts
fetchTasks(projectId: string): Promise<Task[]>
createTask(payload: CreateTaskPayload): Promise<Task>
updateTask(payload: UpdateTaskPayload): Promise<Task>
deleteTask(id: string): Promise<void>
updateStatus(id: string, status: TaskStatus): Promise<Task>
updatePosition(id: string, x: number, y: number): Promise<Task>
```

### 3. Tasks composable (`src/modules/tasks/composables/useTasks.ts`)

```ts
const { tasks, loading, error, createTask, updateTask, deleteTask } = useTasks(projectId)
```

### 4. Components

| Component | Purpose |
| --------- | ------- |
| `TaskCard.vue` | Displays task title, status badge, energy and impact indicators |
| `TaskForm.vue` | Create / edit form with all fields |

### 5. Constraints

- `energy_level`: 1–3 (enforced in DB + UI)
- `impact_score`: 1–5 (enforced in DB + UI)
- Max 3 tasks in `doing` status per project — enforced in UI, not DB

---

## Acceptance Criteria

- [ ] User can create, edit, and delete tasks
- [ ] Status, energy level, and impact score are assignable
- [ ] Tasks are scoped to the active project
- [ ] `position_x` / `position_y` update correctly for graph view
- [ ] No Supabase calls outside the service layer
- [ ] All types defined — no `any`
