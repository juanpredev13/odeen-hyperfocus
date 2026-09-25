-- ============================================================
-- Migration: Assistant module foundation (#21)
-- Tables: assistant_settings, assistant_connections
-- ============================================================

-- Enum: external providers the assistant can connect to
create type assistant_provider as enum ('gmail', 'google-calendar', 'obsidian');

-- ============================================================
-- assistant_settings
-- One row per user. Created lazily on first save; the client
-- falls back to column defaults when no row exists yet.
-- ============================================================
create table assistant_settings (
  user_id                 uuid primary key references profiles (id) on delete cascade,
  checkin_interval        integer not null default 0 check (checkin_interval in (0, 60, 90)),
  default_session_minutes integer not null default 15 check (default_session_minutes between 5 and 180),
  distraction_checklist   jsonb not null default '[
    "Phone in another room",
    "Do Not Disturb on",
    "Distraction blocker on",
    "Headphones on"
  ]'::jsonb check (jsonb_typeof(distraction_checklist) = 'array'),
  break_activities        jsonb not null default '[
    "Short walk",
    "Coffee without phone",
    "Stretch",
    "Chat with a colleague"
  ]'::jsonb check (jsonb_typeof(break_activities) = 'array'),
  updated_at              timestamptz not null default now()
);

alter table assistant_settings enable row level security;

create policy "Users can view their own assistant settings"
  on assistant_settings for select
  using (auth.uid() = user_id);

create policy "Users can create their own assistant settings"
  on assistant_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own assistant settings"
  on assistant_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own assistant settings"
  on assistant_settings for delete
  using (auth.uid() = user_id);

-- ============================================================
-- assistant_connections
-- OAuth / data-source connections per provider.
-- Rows are written only by Edge Functions (service role) during
-- the OAuth callback. The client may read non-secret columns and
-- delete (disconnect) its own rows; it can never read the token.
-- ============================================================
create table assistant_connections (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references profiles (id) on delete cascade,
  provider                assistant_provider not null,
  refresh_token_encrypted text,
  scopes                  text[] not null default '{}',
  connected_at            timestamptz not null default now(),
  constraint unique_user_provider unique (user_id, provider)
);

alter table assistant_connections enable row level security;

create policy "Users can view their own connections"
  on assistant_connections for select
  using (auth.uid() = user_id);

create policy "Users can delete their own connections"
  on assistant_connections for delete
  using (auth.uid() = user_id);

-- Column-level privileges: hide the encrypted token from client roles.
revoke all on assistant_connections from anon, authenticated;
grant select (id, user_id, provider, scopes, connected_at) on assistant_connections to authenticated;
grant delete on assistant_connections to authenticated;
