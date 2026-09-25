-- ============================================================
-- Migration: Task quadrants (#30)
-- Adds tasks.is_attractive ("Enjoyable?"). Combined with
-- impact_score (productive when >= 3) it derives one of four
-- quadrants on the client: necessary / purposeful / unnecessary /
-- distracting. Existing rows default to false.
-- ============================================================
alter table tasks
  add column is_attractive boolean not null default false;
