-- ============================================================
-- Migration: Time-blocked schedule with segments (#63)
--   schedule_segments      → categories of time (Work, Learning, …)
--   schedule_blocks        → a time range on a day, one segment each.
--                            Template rows use day_of_week (1 = Mon … 7 = Sun,
--                            ISO); override rows use a calendar date.
--   schedule_day_overrides → marks a date whose blocks replace the template
--                            for that day (the date may have zero blocks).
-- Times are minutes from local midnight, on 15-minute mini-slots.
-- Blocks never overlap within the same day (exclusion constraints).
-- ============================================================

create extension if not exists btree_gist with schema extensions;

create table schedule_segments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 40),
  icon       text not null default 'circle',
  color_key  text not null default 'emerald'
             check (color_key in ('emerald', 'mint', 'sage', 'amber', 'slate', 'sky', 'rose')),
  position   smallint not null default 0,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

create index schedule_segments_user_idx on schedule_segments (user_id, position);

create table schedule_blocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles (id) on delete cascade,
  segment_id   uuid not null references schedule_segments (id) on delete cascade,
  day_of_week  smallint check (day_of_week between 1 and 7),
  date         date,
  start_minute smallint not null,
  end_minute   smallint not null,
  title        text check (title is null or length(title) <= 120),
  note         text check (note is null or length(note) <= 1000),
  created_at   timestamptz not null default now(),
  constraint template_or_override check ((day_of_week is null) <> (date is null)),
  constraint minutes_in_day check (start_minute >= 0 and end_minute <= 1440),
  constraint start_before_end check (start_minute < end_minute),
  constraint quarter_hour_slots check (start_minute % 15 = 0 and end_minute % 15 = 0),
  constraint no_template_overlap exclude using gist (
    user_id with =,
    day_of_week with =,
    int4range(start_minute, end_minute) with &&
  ) where (day_of_week is not null),
  constraint no_override_overlap exclude using gist (
    user_id with =,
    date with =,
    int4range(start_minute, end_minute) with &&
  ) where (date is not null)
);

create index schedule_blocks_user_date_idx on schedule_blocks (user_id, date) where date is not null;

create table schedule_day_overrides (
  user_id    uuid not null references profiles (id) on delete cascade,
  date       date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- ── RLS ──
alter table schedule_segments enable row level security;
alter table schedule_blocks enable row level security;
alter table schedule_day_overrides enable row level security;

create policy "Users can view their own segments"
  on schedule_segments for select using (auth.uid() = user_id);
create policy "Users can create their own segments"
  on schedule_segments for insert with check (auth.uid() = user_id);
create policy "Users can update their own segments"
  on schedule_segments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own segments"
  on schedule_segments for delete using (auth.uid() = user_id);

-- A block's segment must be one of the user's own segments.
create policy "Users can view their own blocks"
  on schedule_blocks for select using (auth.uid() = user_id);
create policy "Users can create their own blocks"
  on schedule_blocks for insert
  with check (
    auth.uid() = user_id
    and segment_id in (select s.id from schedule_segments s where s.user_id = auth.uid())
  );
create policy "Users can update their own blocks"
  on schedule_blocks for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and segment_id in (select s.id from schedule_segments s where s.user_id = auth.uid())
  );
create policy "Users can delete their own blocks"
  on schedule_blocks for delete using (auth.uid() = user_id);

create policy "Users can view their own day overrides"
  on schedule_day_overrides for select using (auth.uid() = user_id);
create policy "Users can create their own day overrides"
  on schedule_day_overrides for insert with check (auth.uid() = user_id);
create policy "Users can delete their own day overrides"
  on schedule_day_overrides for delete using (auth.uid() = user_id);

-- ============================================================
-- Focus sessions are tagged with the segment they ran in.
-- ============================================================
alter table focus_sessions
  add column segment_id uuid references schedule_segments (id) on delete set null;

drop policy "Users can create their own sessions" on focus_sessions;
drop policy "Users can update their own sessions" on focus_sessions;

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
    and (
      segment_id is null
      or segment_id in (select s.id from schedule_segments s where s.user_id = auth.uid())
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
    and (
      segment_id is null
      or segment_id in (select s.id from schedule_segments s where s.user_id = auth.uid())
    )
  );
