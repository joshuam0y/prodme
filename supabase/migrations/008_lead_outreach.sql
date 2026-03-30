-- Shared outreach workflow for Saved + Interested leads.

create table if not exists public.lead_outreach (
  viewer_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'sent', 'follow_up')),
  message_draft text,
  last_contacted_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (viewer_id, target_id)
);

create index if not exists lead_outreach_viewer_updated_idx
  on public.lead_outreach (viewer_id, updated_at desc);

alter table public.lead_outreach enable row level security;

create policy "lead_outreach_select_own"
  on public.lead_outreach for select
  using (auth.uid() = viewer_id);

create policy "lead_outreach_insert_own"
  on public.lead_outreach for insert
  with check (auth.uid() = viewer_id);

create policy "lead_outreach_update_own"
  on public.lead_outreach for update
  using (auth.uid() = viewer_id);

create policy "lead_outreach_delete_own"
  on public.lead_outreach for delete
  using (auth.uid() = viewer_id);
