# Issue #6 — Kanban Board

## Objective

Implement a three-column Kanban board with drag-and-drop and a cognitive overload protection (WIP limit).

## Reference

- `docs/requirements.md` — Section 2.4
- Issue #5 (Tasks module) — must be completed first

---

## Steps

### 1. View (`src/modules/kanban/views/KanbanView.vue`)

Three columns rendered from task status:

| Column | Status |
| ------ | ------ |
| To Do  | `todo` |
| Doing  | `doing` |
| Done   | `done` |

### 2. Drag and drop

- Use the native HTML5 Drag and Drop API (no external library)
- On drop: call `tasks.service.updateStatus(id, newStatus)`
- Keep interactions under 16ms frame budget

### 3. WIP limit — max 3 tasks in "Doing"

- If dropping into "Doing" would exceed 3 tasks: block the drop and show a visual overload warning
- Warning is inline — no modal, no toast

### 4. Components

| Component | Purpose |
| --------- | ------- |
| `KanbanColumn.vue` | Single column with header and task list |
| `KanbanCard.vue` | Draggable task card — BEM block `.kanban-card` |

### 5. BEM classes

```
.kanban
.kanban__column
.kanban__column--overloaded
.kanban__card
.kanban__card--dragging
.kanban__warning
```

---

## Acceptance Criteria

- [ ] Three columns display tasks by status
- [ ] Tasks can be dragged between columns
- [ ] Status persists to Supabase on drop
- [ ] Dropping into "Doing" with 3+ tasks is blocked
- [ ] Overload warning is displayed visually
- [ ] No external drag-and-drop library
