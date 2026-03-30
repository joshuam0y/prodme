-- Lightweight buyer pipeline for profiles marked as "interested".

create table if not exists public.interested_pipeline (
  viewer_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  stage text not null default 'new' check (stage in ('new', 'contacted', 'negotiating', 'closed')),
  note text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (viewer_id, target_id)
);

create index if not exists interested_pipeline_viewer_updated_idx
  on public.interested_pipeline (viewer_id, updated_at desc);

alter table public.interested_pipeline enable row level security;

create policy "interested_pipeline_select_own"
  on public.interested_pipeline for select
  using (auth.uid() = viewer_id);

create policy "interested_pipeline_insert_own"
  on public.interested_pipeline for insert
  with check (auth.uid() = viewer_id);

create policy "interested_pipeline_update_own"
  on public.interested_pipeline for update
  using (auth.uid() = viewer_id);

create policy "interested_pipeline_delete_own"
  on public.interested_pipeline for delete
  using (auth.uid() = viewer_id);
