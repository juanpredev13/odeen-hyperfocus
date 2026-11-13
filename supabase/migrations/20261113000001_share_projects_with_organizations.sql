-- ============================================================
-- Share projects (and their tasks) with an organization (#108, phase 2 of #106).
--
-- projects.organization_id is nullable: personal projects stay personal.
-- projects.client_id must be a client of that same organization.
-- Organization members can read and write the organization's projects, their
-- tasks, task connections and task links. Only the project's creator can move
-- it into or out of an organization, change its client, or delete it.
-- ============================================================

alter table clients
  add constraint clients_id_organization_id_key unique (id, organization_id);

alter table projects
  add column organization_id uuid references organizations (id) on delete set null,
  add column client_id uuid,
  add constraint projects_client_requires_organization
    check (client_id is null or organization_id is not null),
  -- Composite key: the client must belong to the project's organization.
  add constraint projects_client_same_organization
    foreign key (client_id, organization_id)
    references clients (id, organization_id)
    on delete set null (client_id);

create index projects_organization_id_idx on projects (organization_id);
create index projects_client_id_idx on projects (client_id);

-- ============================================================
-- Access helpers. security definer so the tasks/links policies can ask about a
-- project without re-running every projects policy for each row.
-- ============================================================

create or replace function public.can_access_project(p uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects pr
    where pr.id = p
      and (
        pr.user_id = auth.uid()
        or (pr.organization_id is not null and public.is_organization_member(pr.organization_id))
      )
  )
$$;

create or replace function public.can_access_task(t uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tasks tk
    where tk.id = t and public.can_access_project(tk.project_id)
  )
$$;

-- ============================================================
-- Guard the sharing columns. Policies cannot compare old and new values, so
-- the ownership rules for organization_id / client_id live in a trigger.
-- ============================================================

create or replace function public.guard_project_sharing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Leaving an organization always drops the client too (also covers the
  -- set-null cascade when an organization is deleted).
  if new.organization_id is null then
    new.client_id := null;
  end if;

  -- Cascaded updates from deleting an organization or client run as triggers
  -- (depth > 1) on behalf of whoever deleted it, not the project creator.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'A project''s creator cannot change' using errcode = '42501';
    end if;

    if (new.organization_id is distinct from old.organization_id
        or new.client_id is distinct from old.client_id)
       and old.user_id is distinct from auth.uid() then
      raise exception 'Only the project''s creator can change its organization or client'
        using errcode = '42501';
    end if;
  end if;

  if new.organization_id is not null
     and (tg_op = 'INSERT' or new.organization_id is distinct from old.organization_id)
     and not public.is_organization_member(new.organization_id) then
    raise exception 'You are not a member of that organization' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger projects_guard_sharing
  before insert or update on projects
  for each row execute function public.guard_project_sharing();

-- ============================================================
-- projects
-- ============================================================

drop policy "Users can view their own projects" on projects;
drop policy "Users can create their own projects" on projects;
drop policy "Users can update their own projects" on projects;
drop policy "Users can delete their own projects" on projects;

create policy "Users can view their own and their organizations' projects"
  on projects for select
  using (
    auth.uid() = user_id
    or (organization_id is not null and public.is_organization_member(organization_id))
  );

create policy "Users can create their own projects"
  on projects for insert
  with check (
    auth.uid() = user_id
    and (organization_id is null or public.is_organization_member(organization_id))
  );

create policy "Users can update their own and their organizations' projects"
  on projects for update
  using (
    auth.uid() = user_id
    or (organization_id is not null and public.is_organization_member(organization_id))
  )
  with check (
    auth.uid() = user_id
    or (organization_id is not null and public.is_organization_member(organization_id))
  );

create policy "Creators can delete their projects"
  on projects for delete
  using (auth.uid() = user_id);

-- ============================================================
-- tasks
-- ============================================================

drop policy "Users can view tasks in their projects" on tasks;
drop policy "Users can create tasks in their projects" on tasks;
drop policy "Users can update tasks in their projects" on tasks;
drop policy "Users can delete tasks in their projects" on tasks;

create policy "Users can view tasks in projects they can access"
  on tasks for select
  using (public.can_access_project(project_id));

create policy "Users can create tasks in projects they can access"
  on tasks for insert
  with check (public.can_access_project(project_id));

create policy "Users can update tasks in projects they can access"
  on tasks for update
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

create policy "Users can delete tasks in projects they can access"
  on tasks for delete
  using (public.can_access_project(project_id));

-- ============================================================
-- task_connections
-- ============================================================

drop policy "Users can view connections between their tasks" on task_connections;
drop policy "Users can create connections between their tasks" on task_connections;
drop policy "Users can delete connections between their tasks" on task_connections;

create policy "Users can view connections between tasks they can access"
  on task_connections for select
  using (public.can_access_task(source_task_id));

create policy "Users can create connections between tasks they can access"
  on task_connections for insert
  with check (public.can_access_task(source_task_id) and public.can_access_task(target_task_id));

create policy "Users can delete connections between tasks they can access"
  on task_connections for delete
  using (public.can_access_task(source_task_id));

-- ============================================================
-- task_links
-- ============================================================

drop policy "Users can view links on their tasks" on task_links;
drop policy "Users can create links on their tasks" on task_links;
drop policy "Users can delete links on their tasks" on task_links;

create policy "Users can view links on tasks they can access"
  on task_links for select
  using (public.can_access_task(task_id));

create policy "Users can create links on tasks they can access"
  on task_links for insert
  with check (public.can_access_task(task_id));

create policy "Users can delete links on tasks they can access"
  on task_links for delete
  using (public.can_access_task(task_id));

-- ============================================================
-- Personal rows that point at a task (captures, intentions, focus sessions)
-- stay private to their user, but may now point at a shared task.
-- ============================================================

drop policy "Users can create their own captures" on captures;
drop policy "Users can update their own captures" on captures;

create policy "Users can create their own captures"
  on captures for insert
  with check (
    auth.uid() = user_id
    and (task_id is null or public.can_access_task(task_id))
    and (session_id is null or session_id in (
      select s.id from focus_sessions s where s.user_id = auth.uid()
    ))
  );

create policy "Users can update their own captures"
  on captures for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (task_id is null or public.can_access_task(task_id))
  );

drop policy "Users can create their own intentions" on intentions;
drop policy "Users can update their own intentions" on intentions;

create policy "Users can create their own intentions"
  on intentions for insert
  with check (
    auth.uid() = user_id
    and (task_id is null or public.can_access_task(task_id))
  );

create policy "Users can update their own intentions"
  on intentions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (task_id is null or public.can_access_task(task_id))
  );

drop policy "Users can create their own sessions" on focus_sessions;
drop policy "Users can update their own sessions" on focus_sessions;

create policy "Users can create their own sessions"
  on focus_sessions for insert
  with check (
    auth.uid() = user_id
    and (task_id is null or public.can_access_task(task_id))
    and (segment_id is null or segment_id in (
      select s.id from schedule_segments s where s.user_id = auth.uid()
    ))
  );

create policy "Users can update their own sessions"
  on focus_sessions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (task_id is null or public.can_access_task(task_id))
    and (segment_id is null or segment_id in (
      select s.id from schedule_segments s where s.user_id = auth.uid()
    ))
  );
