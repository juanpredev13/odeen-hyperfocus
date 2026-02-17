# Issue #8 — Focus Mode

## Objective

Implement a distraction-free, full-screen view that isolates a single active task.

## Reference

- `docs/requirements.md` — Section 2.6
- Issue #5 (Tasks module) — must be completed first

---

## Steps

### 1. View (`src/modules/focus/views/FocusView.vue`)

- Full-screen layout, no sidebar or navigation
- Displays only the active task: title, description, energy level, impact score
- Single action: mark task as done
- Entry via route `/focus/:taskId`

### 2. Layout

```
.focus
.focus__task
.focus__task-title
.focus__task-description
.focus__task-meta
.focus__action
.focus__exit
```

### 3. Transitions

- Smooth entry transition when entering focus mode
- Smooth exit transition back to previous view (Kanban or Projects)

### 4. Behaviour

- Marking task as done calls `tasks.service.updateStatus(id, 'done')` and navigates back
- Exit button returns to previous route without changing task status

---

## Acceptance Criteria

- [ ] Full-screen layout with no navigation chrome
- [ ] Displays only the selected task
- [ ] Task can be marked as done
- [ ] Exit returns to previous view
- [ ] Entry and exit transitions are smooth
- [ ] BEM styles, no utility classes
