-- ============================================================
-- Migration: Capture inbox (#32)
-- Anything that pulls attention away gets captured here and
-- processed later: converted to a task, attached to a task, or
-- archived. `problem` captures can be pinned for incubation.
-- session_id will reference focus_sessions once #20 lands.
-- ============================================================

create type capture_kind as enum ('distraction', 'open_loop', 'idea', 'problem', 'worry', 'waiting_for');
create type capture_status as enum ('inbox', 'converted', 'archived');

create table captures (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles (id) on delete cascade,
  session_id   uuid,
  kind         capture_kind not null default 'open_loop',
  text         text not null check (length(trim(text)) > 0 and length(text) <= 1000),
  status       capture_status not null default 'inbox',
  task_id      uuid references tasks (id) on delete set null,
  pinned       boolean not null default false,
  created_at   timestamptz not null default now(),
  processed_at timestamptz,
  constraint pinned_only_problems check (not pinned or kind = 'problem'),
  constraint processed_has_timestamp check ((status = 'inbox') = (processed_at is null))
);

create index captures_user_status_idx on captures (user_id, status, created_at desc);

alter table captures enable row level security;

create policy "Users can view their own captures"
  on captures for select
  using (auth.uid() = user_id);

create policy "Users can create their own captures"
  on captures for insert
  with check (
    auth.uid() = user_id
    and (
      task_id is null
      or task_id in (
        select t.id from tasks t
        join projects p on p.id = t.project_id
        where p.user_id = auth.uid()
      )
    )
  );

create policy "Users can update their own captures"
  on captures for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      task_id is null
      or task_id in (
        select t.id from tasks t
        join projects p on p.id = t.project_id
        where p.user_id = auth.uid()
      )
    )
  );

create policy "Users can delete their own captures"
  on captures for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Processing functions — run as the caller (security invoker), so
-- every statement is still checked by RLS. Each is one transaction:
-- the task and the capture change together or not at all.
-- ============================================================

-- Creates a task from an inbox capture and marks the capture converted.
create or replace function convert_capture_to_task(p_capture_id uuid, p_project_id uuid)
returns tasks
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_capture captures;
  v_task    tasks;
begin
  select * into v_capture
  from captures
  where id = p_capture_id and status = 'inbox'
  for update;

  if not found then
    raise exception 'Capture not found or already processed' using errcode = 'P0002';
  end if;

  insert into tasks (project_id, title)
  values (p_project_id, left(v_capture.text, 200))
  returning * into v_task;

  update captures
  set status = 'converted', task_id = v_task.id, processed_at = now(), pinned = false
  where id = p_capture_id;

  return v_task;
end;
$$;

-- Appends an inbox capture to an existing task's description and
-- marks the capture converted (linked to that task).
create or replace function attach_capture_to_task(p_capture_id uuid, p_task_id uuid)
returns captures
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_capture captures;
begin
  select * into v_capture
  from captures
  where id = p_capture_id and status = 'inbox'
  for update;

  if not found then
    raise exception 'Capture not found or already processed' using errcode = 'P0002';
  end if;

  update tasks
  set description = concat_ws(E'\n\n', nullif(description, ''), '• ' || v_capture.text)
  where id = p_task_id;

  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  update captures
  set status = 'converted', task_id = p_task_id, processed_at = now(), pinned = false
  where id = p_capture_id
  returning * into v_capture;

  return v_capture;
end;
$$;

revoke execute on function convert_capture_to_task(uuid, uuid) from public, anon;
revoke execute on function attach_capture_to_task(uuid, uuid) from public, anon;
grant execute on function convert_capture_to_task(uuid, uuid) to authenticated;
grant execute on function attach_capture_to_task(uuid, uuid) to authenticated;
