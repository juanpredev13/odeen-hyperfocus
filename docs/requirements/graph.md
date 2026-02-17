# Issue #7 — Graph View

## Objective

Implement a canvas-based graph where tasks are nodes, connections are edges, and positions persist in Supabase. The graph module loads only when accessed (lazy loaded).

## Reference

- `docs/requirements.md` — Section 2.5
- `supabase/migrations/20260217000001_create_schema.sql` — `task_connections` table
- Issue #5 (Tasks module) — must be completed first

---

## Steps

### 1. Rendering

- Use the Canvas API or SVG (no external graph library)
- Each task is a node: display title, status color
- Connections are directed edges between nodes
- Nodes are positioned using `task.position_x` / `task.position_y`

### 2. Interactions

- **Drag nodes** — update position on drag end, persist via `tasks.service.updatePosition`
- **Create connection** — click source node → click target node → save via connections service
- **Zoom and pan** — basic canvas transform (scale + translate)

### 3. Graph service (`src/modules/graph/services/graph.service.ts`)

```ts
fetchConnections(projectId: string): Promise<TaskConnection[]>
createConnection(sourceId: string, targetId: string): Promise<TaskConnection>
deleteConnection(id: string): Promise<void>
```

### 4. Types (`src/modules/graph/types/index.ts`)

```ts
interface TaskConnection {
  id: string
  source_task_id: string
  target_task_id: string
}

interface NodePosition {
  id: string
  x: number
  y: number
}
```

### 5. Performance

- Module is **lazy loaded** — only imported when the `/graph` route is accessed
- Avoid re-rendering the full canvas on every state change — diff only changed nodes

---

## Acceptance Criteria

- [ ] Tasks render as nodes on a canvas
- [ ] Connections render as edges between nodes
- [ ] Nodes are draggable and positions persist
- [ ] Connections can be created manually
- [ ] Zoom and pan work
- [ ] Module is lazy loaded
- [ ] No external graph library
