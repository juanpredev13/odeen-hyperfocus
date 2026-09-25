-- ============================================================
-- Migration: Focus sessions (#20)
-- One row per timed session. Hyperfocus sessions use
-- mode = 'hyperfocus'; the scatter_* and break modes are
-- reserved for #34 and #35.
-- ============================================================

create type session_mode as enum (
  'hyperfocus',
  'scatter_capture',
  'scatter_problem',
  'scatter_habitual',
  'break'
);

create table focus_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles (id) on delete cascade,
  task_id         uuid references tasks (id) on delete set null,
  mode            session_mode not null default 'hyperfocus',
  planned_minutes integer not null check (planned_minutes between 1 and 240),
  actual_minutes  integer check (actual_minutes >= 0),
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  refocus_count   integer not null default 0 check (refocus_count >= 0),
  extended        boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  constraint ended_after_start check (ended_at is null or ended_at >= started_at),
  constraint ended_has_actual check ((ended_at is null) = (actual_minutes is null))
);

-- At most one running session per user.
create unique index focus_sessions_one_active_idx
  on focus_sessions (user_id)
  where ended_at is null;

create index focus_sessions_user_started_idx on focus_sessions (user_id, started_at desc);

alter table focus_sessions enable row level security;

create policy "Users can view their own sessions"
  on focus_sessions for select
  using (auth.uid() = user_id);

create policy "Users can create their own sessions"
  on focus_sessions for insert
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

create policy "Users can update their own sessions"
  on focus_sessions for update
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

create policy "Users can delete their own sessions"
  on focus_sessions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- captures.session_id now references focus_sessions (#32 left it
-- unconstrained). A capture may only point at the user's own session.
-- ============================================================
alter table captures
  add constraint captures_session_id_fkey
  foreign key (session_id) references focus_sessions (id) on delete set null;

drop policy "Users can create their own captures" on captures;

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
    and (
      session_id is null
      or session_id in (select s.id from focus_sessions s where s.user_id = auth.uid())
    )
  );

-- ============================================================
-- Session settings: sound at the end of a session.
-- ============================================================
alter table assistant_settings
  add column end_sound boolean not null default true;
