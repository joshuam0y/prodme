alter table public.match_message_reports
  add column if not exists status text not null default 'open';

alter table public.match_message_reports
  add column if not exists resolved_at timestamptz;

alter table public.match_message_reports
  add column if not exists resolved_by uuid references auth.users (id) on delete set null;

create index if not exists match_message_reports_status_created_idx
  on public.match_message_reports (status, created_at desc);
