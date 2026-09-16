# ODEEN — Repository Setup

## Setup Commands

- Install dependencies: `pnpm install`
- Start development server: `pnpm dev`
- Build the application: `pnpm build`
- Run linting: `pnpm lint`

## Code Style

- Use strict TypeScript
- Follow BEM naming convention in CSS
- Use Vue 3 Composition API with TypeScript
- Adhere to POC specific database schema defined in `docs/requirements.md`

## Testing

- Run tests with `pnpm lint`, `pnpm typecheck`, and `npm run dev`

## Conventions

- Use path aliases like `@/modules/auth/` for import statements
- Separate concerns into views, components, services, and composable directories
- Handle Supabase errors explicitly and never bypass RLS

## Project Structure

- `src/modules`: Contains feature-specific directories with views, components, services, composables, and types.
- `src/services`: Shared services for database logic.
- `src/composables`: Global reactive state and logic.
- `src/store`: Global application state.
- `src/types`: Generic types for the project.

## Database Schema

- Four tables: `profiles`, `projects`, `tasks`, `task_connections`
- RLS is enabled on all tables.

## Commits

- Follow Conventional Commits format as defined in the project structure.
- Never commit `.env` files, credentials, or Supabase keys.