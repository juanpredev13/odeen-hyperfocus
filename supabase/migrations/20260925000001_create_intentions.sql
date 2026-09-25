-- ============================================================
-- Migration: Intentions — Rule of 3 (#31)
-- Up to 3 intentions per user, date and scope. The limit is
-- enforced by position (1–3) + a unique constraint.
--   day      → date = the calendar day
--   week     → date = Monday of that week
--   personal → date = the calendar day
-- ============================================================

create type intention_scope as enum ('day', 'week', 'personal');

create table intentions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles (id) on delete cascade,
  date         date not null,
  scope        intention_scope not null default 'day',
  position     smallint not null check (position between 1 and 3),
  task_id      uuid references tasks (id) on delete set null,
  text         text not null check (length(trim(text)) > 0),
  when_text    text,
  where_text   text,
  first_action text,
  done         boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint unique_intention_slot unique (user_id, date, scope, position),
  constraint week_starts_on_monday check (scope <> 'week' or extract(isodow from date) = 1)
);

create index intentions_user_date_idx on intentions (user_id, date);

alter table intentions enable row level security;

create policy "Users can view their own intentions"
  on intentions for select
  using (auth.uid() = user_id);

-- A linked task must belong to one of the user's projects.
create policy "Users can create their own intentions"
  on intentions for insert
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

create policy "Users can update their own intentions"
  on intentions for update
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

create policy "Users can delete their own intentions"
  on intentions for delete
  using (auth.uid() = user_id);
