-- Swipe outcomes on Discover (pass / save / interested) for logged-in users.

create table if not exists public.discover_swipes (
  viewer_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('pass', 'save', 'interested')),
  created_at timestamptz not null default now(),
  primary key (viewer_id, target_id)
);

create index if not exists discover_swipes_viewer_created_idx
  on public.discover_swipes (viewer_id, created_at desc);

alter table public.discover_swipes enable row level security;

create policy "discover_swipes_select_own"
  on public.discover_swipes for select
  using (auth.uid() = viewer_id);

create policy "discover_swipes_insert_own"
  on public.discover_swipes for insert
  with check (auth.uid() = viewer_id);

create policy "discover_swipes_update_own"
  on public.discover_swipes for update
  using (auth.uid() = viewer_id);

create policy "discover_swipes_delete_own"
  on public.discover_swipes for delete
  using (auth.uid() = viewer_id);
