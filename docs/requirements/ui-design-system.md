# Issue #9 — UI Design System

## Objective

Establish the base CSS3 + BEM design system used across all modules. Design tokens are sourced from the Stitch desktop atoms.

## Reference

- `docs/requirements.md` — Section 6
- `stitch/design-system-desktop-atoms/` — source of truth for tokens
- `src/styles/` — implementation

---

## Design Tokens

Defined in `src/styles/variables.css`:

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--color-primary` | `#111111` | Text, borders |
| `--color-surface` | `#ffffff` | Card backgrounds |
| `--color-background` | `#f9fafb` | Page background |
| `--color-status-active` | `#f3e8ff` | "Doing" status |
| `--color-status-focus` | `#e0f2fe` | Focus mode accent |
| `--color-status-done` | `#dcfce7` | "Done" status |
| `--font-size-display` | `64px` | H1 / Display |
| `--font-size-h2` | `32px` | Section titles |
| `--font-size-h3` | `20px` | Card titles |
| `--font-size-body` | `16px` | Body text |
| `--space-xs` | `4px` | Atomic unit |
| `--space-sm` | `8px` | Tight spacing |
| `--space-md` | `16px` | Component gap |
| `--space-lg` | `32px` | Section gap |
| `--space-xl` | `64px` | Layout padding |
| `--radius-md` | `12px` | Cards |
| `--radius-lg` | `16px` | Modals, panels |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |

## BEM Patterns

Every component follows strict BEM naming:

```css
/* Block */
.task-card { }

/* Elements */
.task-card__title { }
.task-card__meta { }
.task-card__actions { }

/* Modifiers */
.task-card--doing { }
.task-card--done { }
.task-card--dragging { }
```

Rules:
- One scoped `<style>` block per component
- No utility classes, no inline styles
- No Tailwind or any CSS framework

## Shared Components

Already scaffolded in `src/components/`:

| Component | Purpose |
| --------- | ------- |
| `SectionHeader.vue` | Section divider with icon and title |
| `TypographySample.vue` | Typography specimen |
| `ColorSwatch.vue` | Color token display |
| `StatusBadge.vue` | Status color tile |
| `IconBox.vue` | Material icon in a box |
| `SpacingBlock.vue` | Spacing visualisation |

## Showcase

Live at `/design-system` — see `src/modules/projects/views/DesignSystemView.vue`.

---

## Acceptance Criteria

- [ ] All design tokens defined in `variables.css`
- [ ] Reset and base typography in `reset.css` / `base.css`
- [ ] BEM naming consistent across all components
- [ ] Design system showcase route works
- [ ] No Tailwind or utility CSS installed
