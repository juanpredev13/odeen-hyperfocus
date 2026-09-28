-- ============================================================
-- Migration: Schedule block series (#73)
-- Blocks created together with "Repeat on" (Weekdays, Every day, …)
-- share a series_id, and so do their date copies on edited days.
-- Editing or deleting a block in a series applies to the whole
-- series by default. NULL = a standalone block.
-- ============================================================

alter table schedule_blocks add column series_id uuid;

create index schedule_blocks_series_idx
  on schedule_blocks (user_id, series_id)
  where series_id is not null;

-- Backfill: template blocks that already repeat with the same segment,
-- time range and focus become one series; date copies that match them
-- join the same series.
with groups as (
  select
    user_id,
    segment_id,
    start_minute,
    end_minute,
    coalesce(title, '') as title_key,
    gen_random_uuid() as series_id
  from schedule_blocks
  where day_of_week is not null
  group by user_id, segment_id, start_minute, end_minute, coalesce(title, '')
  having count(*) > 1
)
update schedule_blocks b
set series_id = g.series_id
from groups g
where b.user_id = g.user_id
  and b.segment_id = g.segment_id
  and b.start_minute = g.start_minute
  and b.end_minute = g.end_minute
  and coalesce(b.title, '') = g.title_key;
