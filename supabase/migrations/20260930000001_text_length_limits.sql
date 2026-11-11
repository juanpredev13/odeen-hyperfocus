-- Bound user-supplied text and jsonb so one account cannot inflate database size and egress (#91).
-- The UI enforces the same limits with maxlength. Columns that already had limits
-- (captures.text, schedule_*, task_links.*) are unchanged.

alter table projects
  add constraint projects_name_length check (length(name) <= 120);

alter table tasks
  add constraint tasks_title_length check (length(title) <= 300),
  add constraint tasks_description_length check (description is null or length(description) <= 20000);

alter table intentions
  add constraint intentions_text_length check (length(text) <= 200),
  add constraint intentions_when_text_length check (when_text is null or length(when_text) <= 200),
  add constraint intentions_where_text_length check (where_text is null or length(where_text) <= 200),
  add constraint intentions_first_action_length check (first_action is null or length(first_action) <= 200);

alter table focus_sessions
  add constraint focus_sessions_notes_length check (notes is null or length(notes) <= 5000);

alter table schedule_segments
  add constraint schedule_segments_icon_length check (icon is null or length(icon) <= 40);

-- Checklist and break lists: at most 30 items, and a hard byte cap on the whole value.
alter table assistant_settings
  add constraint assistant_settings_distraction_checklist_size check (
    jsonb_array_length(distraction_checklist) <= 30 and pg_column_size(distraction_checklist) <= 8192
  ),
  add constraint assistant_settings_break_activities_size check (
    jsonb_array_length(break_activities) <= 30 and pg_column_size(break_activities) <= 8192
  );
