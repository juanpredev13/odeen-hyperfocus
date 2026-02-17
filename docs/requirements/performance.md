# Issue #10 — Performance

## Objective

Implement performance optimisations as defined in the non-functional requirements. These apply across all modules.

## Reference

- `docs/requirements.md` — Section 3.3

---

## Requirements

### 1. Lazy load all route views

Every route component must use dynamic import:

```ts
// ✅ Correct
component: () => import('@/modules/kanban/views/KanbanView.vue')

// ❌ Wrong
import KanbanView from '@/modules/kanban/views/KanbanView.vue'
```

### 2. Code splitting per route

Vite handles this automatically when dynamic imports are used. Each route produces a separate chunk in `dist/assets/`.

### 3. Graph module — load only when accessed

The graph module is the heaviest. It must never be included in the initial bundle. Verify in the build output that `GraphView` is in its own chunk.

### 4. Avoid unnecessary re-renders

- Prefer `computed` over methods for derived state
- Use `shallowRef` for large collections that don't need deep reactivity
- Avoid reactive objects in hot paths (drag events, canvas render loops)

### 5. Drag interactions under 16ms

- Use `requestAnimationFrame` for drag position updates
- Never call Supabase inside a drag event — debounce position persistence to `dragend`

---

## Acceptance Criteria

- [ ] All views are lazy loaded (verify with `pnpm build` output)
- [ ] Graph module is a separate chunk
- [ ] No blocking imports in `main.ts` or `router/index.ts`
- [ ] Drag interactions are smooth at 60fps
- [ ] Supabase calls are never inside drag event handlers
