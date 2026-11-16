-- ============================================================
-- Migration: Web Push reminders (#113)
--   push_subscriptions     → one row per browser/device that opted in
--   notification_settings  → which reminders a user wants, and when
--   notification_log       → what was already sent (dedupe per day)
-- The send-reminders Edge Function runs every 5 minutes (pg_cron +
-- pg_net) and decides what is due in each user's own timezone.
-- ============================================================

create table push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles (id) on delete cascade,
  endpoint     text not null unique check (endpoint like 'https://%' and length(endpoint) <= 1000),
  p256dh       text not null check (length(p256dh) <= 200),
  auth         text not null check (length(auth) <= 100),
  user_agent   text check (user_agent is null or length(user_agent) <= 300),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

create index push_subscriptions_user_idx on push_subscriptions (user_id);

create table notification_settings (
  user_id               uuid primary key references profiles (id) on delete cascade,
  timezone              text not null default 'UTC' check (length(timezone) between 1 and 64),
  intentions_enabled    boolean not null default true,
  intentions_time       time not null default '08:00',
  progress_enabled      boolean not null default true,
  progress_time         time not null default '18:00',
  schedule_enabled      boolean not null default true,
  schedule_lead_minutes smallint not null default 10
                        check (schedule_lead_minutes in (5, 10, 15, 30)),
  updated_at            timestamptz not null default now()
);

-- Written only by the Edge Function (service role). Users may read their own.
create table notification_log (
  user_id uuid not null references profiles (id) on delete cascade,
  kind    text not null check (kind in ('intentions', 'progress', 'schedule')),
  ref_key text not null check (length(ref_key) <= 100),
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, ref_key)
);

-- ── RLS ──
alter table push_subscriptions enable row level security;
alter table notification_settings enable row level security;
alter table notification_log enable row level security;

create policy "Users can view their own push subscriptions"
  on push_subscriptions for select using (auth.uid() = user_id);
create policy "Users can create their own push subscriptions"
  on push_subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update their own push subscriptions"
  on push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own push subscriptions"
  on push_subscriptions for delete using (auth.uid() = user_id);

create policy "Users can view their own notification settings"
  on notification_settings for select using (auth.uid() = user_id);
create policy "Users can create their own notification settings"
  on notification_settings for insert with check (auth.uid() = user_id);
create policy "Users can update their own notification settings"
  on notification_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can view their own notification log"
  on notification_log for select using (auth.uid() = user_id);

-- ============================================================
-- Scheduler: every 5 minutes, call the Edge Function.
-- The URL and shared secret live in Vault, set once per project:
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-reminders', 'reminders_function_url');
--   select vault.create_secret('<random secret>', 'reminders_cron_secret');
-- Until both exist the job does nothing.
-- ============================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := url.decrypted_secret,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', secret.decrypted_secret
    ),
    body := '{}'::jsonb
  )
  from vault.decrypted_secrets url, vault.decrypted_secrets secret
  where url.name = 'reminders_function_url'
    and secret.name = 'reminders_cron_secret'
  $$
);
