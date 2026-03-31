alter table public.match_message_reports
  add column if not exists ai_summary text,
  add column if not exists ai_priority text,
  add column if not exists ai_labels jsonb not null default '[]'::jsonb,
  add column if not exists ai_triaged_at timestamptz;

create index if not exists match_message_reports_ai_priority_created_idx
  on public.match_message_reports (ai_priority, created_at desc);
