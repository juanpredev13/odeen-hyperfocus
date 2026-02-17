-- ============================================================
-- Migration: Create ODEEN schema
-- Tables: profiles, projects, tasks, task_connections
-- ============================================================

-- Enum: task status
create type task_status as enum ('todo', 'doing', 'done');

-- ============================================================
-- profiles
-- Mirrors auth.users — created automatically on sign-up.
-- ============================================================
create table profiles (
  id    uuid primary key references auth.users (id) on delete cascade,
  email text not null
);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- projects
-- ============================================================
create table projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- tasks
-- ============================================================
create table tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects (id) on delete cascade,
  title        text not null,
  description  text,
  status       task_status not null default 'todo',
  energy_level integer not null default 1 check (energy_level between 1 and 3),
  impact_score integer not null default 1 check (impact_score between 1 and 5),
  position_x   float8,
  position_y   float8,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- task_connections
-- Directed edge between two tasks within the same user scope.
-- ============================================================
create table task_connections (
  id             uuid primary key default gen_random_uuid(),
  source_task_id uuid not null references tasks (id) on delete cascade,
  target_task_id uuid not null references tasks (id) on delete cascade,
  constraint no_self_loop check (source_task_id <> target_task_id),
  constraint unique_connection unique (source_task_id, target_task_id)
);
