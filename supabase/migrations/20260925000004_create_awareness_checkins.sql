-- ============================================================
-- Migration: Awareness check-ins (#33)
-- Short, opt-in answers about the state of the user's attention.
-- Every answer is optional, but a row needs at least one.
-- Feeds the energy curve (#36) and the weekly review (#37).
-- ============================================================

create table awareness_checkins (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles (id) on delete cascade,
  at               timestamptz not null default now(),
  intentional      boolean,
  on_consequential boolean,
  space_fullness   smallint check (space_fullness between 1 and 3),
  energy           smallint check (energy between 1 and 5),
  constraint has_an_answer check (
    intentional is not null
    or on_consequential is not null
    or space_fullness is not null
    or energy is not null
  )
);

create index awareness_checkins_user_at_idx on awareness_checkins (user_id, at desc);

alter table awareness_checkins enable row level security;

create policy "Users can view their own check-ins"
  on awareness_checkins for select
  using (auth.uid() = user_id);

create policy "Users can create their own check-ins"
  on awareness_checkins for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own check-ins"
  on awareness_checkins for delete
  using (auth.uid() = user_id);

-- Check-ins are a log: no update policy, so answers can't be rewritten.
