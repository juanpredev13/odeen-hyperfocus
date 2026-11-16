-- ============================================================
-- Migration: Plan-tomorrow reminder (#113)
-- A second intentions nudge in the afternoon: close the day and
-- set tomorrow's 3 intentions. The morning nudge moves to 09:00.
-- ============================================================

alter table notification_settings
  add column plan_tomorrow_enabled boolean not null default true,
  add column plan_tomorrow_time    time not null default '16:30',
  alter column intentions_time set default '09:00';

update notification_settings set intentions_time = '09:00' where intentions_time = '08:00';

alter table notification_log drop constraint notification_log_kind_check;
alter table notification_log
  add constraint notification_log_kind_check
  check (kind in ('intentions', 'plan_tomorrow', 'progress', 'schedule'));
