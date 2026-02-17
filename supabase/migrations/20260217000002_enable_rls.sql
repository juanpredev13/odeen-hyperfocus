-- ============================================================
-- Migration: Enable RLS + policies for all tables
-- All data is scoped to the authenticated user via auth.uid()
-- ============================================================

-- ============================================================
-- profiles
-- ============================================================
alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- ============================================================
-- projects
-- ============================================================
alter table projects enable row level security;

create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can create their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- ============================================================
-- tasks
-- Ownership is resolved through projects.user_id
-- ============================================================
alter table tasks enable row level security;

create policy "Users can view tasks in their projects"
  on tasks for select
  using (
    project_id in (
      select id from projects where user_id = auth.uid()
    )
  );

create policy "Users can create tasks in their projects"
  on tasks for insert
  with check (
    project_id in (
      select id from projects where user_id = auth.uid()
    )
  );

create policy "Users can update tasks in their projects"
  on tasks for update
  using (
    project_id in (
      select id from projects where user_id = auth.uid()
    )
  );

create policy "Users can delete tasks in their projects"
  on tasks for delete
  using (
    project_id in (
      select id from projects where user_id = auth.uid()
    )
  );

-- ============================================================
-- task_connections
-- Ownership resolved through tasks → projects.user_id
-- ============================================================
alter table task_connections enable row level security;

create policy "Users can view connections between their tasks"
  on task_connections for select
  using (
    source_task_id in (
      select t.id from tasks t
      join projects p on p.id = t.project_id
      where p.user_id = auth.uid()
    )
  );

create policy "Users can create connections between their tasks"
  on task_connections for insert
  with check (
    source_task_id in (
      select t.id from tasks t
      join projects p on p.id = t.project_id
      where p.user_id = auth.uid()
    )
    and
    target_task_id in (
      select t.id from tasks t
      join projects p on p.id = t.project_id
      where p.user_id = auth.uid()
    )
  );

create policy "Users can delete connections between their tasks"
  on task_connections for delete
  using (
    source_task_id in (
      select t.id from tasks t
      join projects p on p.id = t.project_id
      where p.user_id = auth.uid()
    )
  );
