-- ============================================================
-- Migration: Task → intention (#79)
-- A task can optionally serve one day or week intention; an
-- intention can be served by several tasks. Independent of
-- intentions.task_id, which stays the task the Focus shortcut
-- opens for an intention created from a task.
-- ============================================================

alter table tasks
  add column intention_id uuid references intentions (id) on delete set null;

create index tasks_intention_idx on tasks (intention_id) where intention_id is not null;

-- The linked intention must be the caller's own. Runs as the caller
-- (security invoker), so RLS on intentions hides everyone else's rows.
create or replace function check_task_intention_owner()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.intention_id is not distinct from old.intention_id then
    return new;
  end if;
  if new.intention_id is not null
     and not exists (select 1 from intentions where id = new.intention_id) then
    raise exception 'Intention not found' using errcode = 'P0002';
  end if;
  return new;
end;
$$;

create trigger tasks_intention_owner
  before insert or update of intention_id on tasks
  for each row execute function check_task_intention_owner();
