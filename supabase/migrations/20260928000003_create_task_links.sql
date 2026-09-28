-- ============================================================
-- Migration: Task links (#75)
-- A task can reference any number of GitHub issues and Obsidian
-- notes. `url` is the canonical link the client opens; its format
-- is enforced per kind so only github.com issue pages and
-- obsidian://open URIs can ever be rendered as hrefs.
-- ============================================================

create type task_link_kind as enum ('github_issue', 'obsidian_note');

create table task_links (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks (id) on delete cascade,
  kind       task_link_kind not null,
  url        text not null check (length(url) <= 2000),
  label      text not null check (length(trim(label)) > 0 and length(label) <= 300),
  created_at timestamptz not null default now(),
  constraint task_links_unique_url unique (task_id, url),
  constraint task_links_url_matches_kind check (
    (kind = 'github_issue' and url ~ '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/issues/[0-9]+$')
    or (kind = 'obsidian_note' and url ~ '^obsidian://open\?vault=[^&]+&file=[^&]+$')
  )
);

create index task_links_task_idx on task_links (task_id, created_at);

alter table task_links enable row level security;

create policy "Users can view links on their tasks"
  on task_links for select
  using (
    task_id in (
      select t.id from tasks t
      join projects p on p.id = t.project_id
      where p.user_id = auth.uid()
    )
  );

create policy "Users can create links on their tasks"
  on task_links for insert
  with check (
    task_id in (
      select t.id from tasks t
      join projects p on p.id = t.project_id
      where p.user_id = auth.uid()
    )
  );

create policy "Users can delete links on their tasks"
  on task_links for delete
  using (
    task_id in (
      select t.id from tasks t
      join projects p on p.id = t.project_id
      where p.user_id = auth.uid()
    )
  );
