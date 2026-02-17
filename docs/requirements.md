# ODEEN — Proof of Concept (POC)

## Deep Work Operating System

ODEEN is a minimalist productivity system that merges structured execution (Kanban + Focus Mode) with connected thinking (Graph View) into a distraction-free interface.

This document defines the full scope, requirements, architecture, and validation criteria for the Proof of Concept (POC).

The purpose of this POC is to validate:

- Core UX philosophy (deep focus + minimalism)
- Vue 3 + TypeScript architecture
- Supabase integration
- Graph + Kanban interoperability
- Modular frontend structure
- CSS3 + BEM design system consistency

This phase does NOT include AI, analytics, collaboration, or advanced metrics.

---

# 1. Technical Stack

## Frontend

- Vue 3 (Composition API)
- TypeScript (strict mode)
- Vite
- CSS3 (no utility frameworks)
- BEM methodology

## Backend

- Supabase
  - Auth
  - PostgreSQL Database
  - Row Level Security (RLS)

## Tooling

- ESLint
- Prettier
- Path aliases
- Modular architecture

---

# 2. Functional Requirements

## 2.1 Authentication

- Register with email + password
- Login
- Logout
- Session persistence
- Protected routes
- Supabase Auth integration

---

## 2.2 Projects Module

- Create project
- Edit project name
- Delete project
- List all projects for authenticated user
- Projects scoped per user

---

## 2.3 Tasks Module

- Create task
- Edit task
- Delete task
- Assign status:
  - `todo`
  - `doing`
  - `done`
- Assign energy level (1–3)
- Assign impact score (1–5)
- Persist task in database

---

## 2.4 Kanban Board

- Three columns:
  - To Do
  - Doing
  - Done
- Drag and drop between columns
- Persist status change in database
- Maximum of 3 tasks allowed in "Doing"
- Display visual overload warning if exceeded

---

## 2.5 Graph View

- Render tasks as nodes
- Display connections between tasks
- Create manual connections between tasks
- Drag nodes freely
- Persist node positions (x, y)
- Load connections dynamically
- Basic zoom and pan functionality

---

## 2.6 Focus Mode

- Display only one active task
- Hide sidebar
- Minimal full-screen layout
- Mark task as completed
- Clean distraction-free UI

---

# 3. Non-Functional Requirements

## 3.1 Architecture

- Modular folder structure
- Clear separation of concerns:
  - UI
  - Domain
  - Services
  - State
- Supabase logic isolated in service layer
- Reusable composables for shared logic

---

## 3.2 Code Standards

- Strict TypeScript typing
- No `any`
- ESLint enforced rules
- Prettier formatting
- Clear naming conventions
- BEM-based CSS structure

---

## 3.3 Performance

- Lazy load main views
- Code splitting per route
- Graph module loads only when accessed
- Avoid unnecessary re-renders
- Optimized drag interactions

---

# 4. Database Schema (POC)

## profiles

- id (uuid, primary key)
- email (string)

---

## projects

- id (uuid, primary key)
- user_id (uuid, foreign key)
- name (string)
- created_at (timestamp)

---

## tasks

- id (uuid, primary key)
- project_id (uuid, foreign key)
- title (string)
- description (text)
- status (enum: todo | doing | done)
- energy_level (integer)
- impact_score (integer)
- position_x (float, nullable)
- position_y (float, nullable)
- created_at (timestamp)

---

## task_connections

- id (uuid, primary key)
- source_task_id (uuid, foreign key)
- target_task_id (uuid, foreign key)

---

# 5. Frontend Module Structure

```
src/
├── app/
├── modules/
│   ├── auth/
│   ├── projects/
│   ├── tasks/
│   ├── kanban/
│   ├── graph/
│   └── focus/
├── services/
├── composables/
├── router/
├── store/
└── styles/
```

---

# 6. UI System (CSS3 + BEM)

## Design Principles

- White background
- Black primary text
- Thin borders
- Large whitespace
- Rounded corners (12–16px)
- Minimal shadows
- No gradients
- No heavy color accents

## BEM Naming Example

```css
.task-card {
}
.task-card__title {
}
.task-card__meta {
}
.task-card--active {
}
.task-card--completed {
}

.kanban {
}
.kanban__column {
}
.kanban__card {
}
.kanban__card--dragging {
}
```

---

# 7. POC Success Criteria

The POC is successful if:

- User can authenticate
- User can create and manage projects
- User can create and manage tasks
- Tasks move correctly between Kanban columns
- 3-task limit in "Doing" is enforced
- Tasks appear as nodes in Graph View
- Task connections are functional
- Node positions persist
- Focus Mode displays a single active task
- All data persists correctly in Supabase
- UI follows minimalist BEM structure

---

# 8. Out of Scope (POC)

- AI features
- Analytics dashboard
- Multi-user collaboration
- Notifications
- Advanced sprint metrics
- Offline mode
- Mobile-first optimization

---

# 9. Figma Mockups

> Paste Figma links below for each module. These serve as the visual source of truth for implementation.

| Module       | Figma Link |
| ------------ | ---------- |
| Auth         | _pending_  |
| Projects     | _pending_  |
| Kanban Board | _pending_  |
| Graph View   | _pending_  |
| Focus Mode   | _pending_  |
| UI System    | _pending_  |

---

# 10. Next Phase (Post-POC)

- Sprint system
- Metrics engine
- Focus score calculation
- AI-based connection suggestions
- Advanced graph clustering
- UI system expansion
- Performance hardening
