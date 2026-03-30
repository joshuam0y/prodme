-- Star ratings a logged-in user assigns to another profile.
-- Used after a discover "event" is completed (save/interested).

create table if not exists public.profile_ratings (
  viewer_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  created_at timestamptz not null default now(),
  primary key (viewer_id, target_id)
);

create index if not exists profile_ratings_target_created_idx
  on public.profile_ratings (target_id, created_at desc);

alter table public.profile_ratings enable row level security;

-- Anyone can read ratings for profiles that have completed onboarding.
create policy "profile_ratings_select_public_completed"
  on public.profile_ratings for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = target_id
        and p.onboarding_completed_at is not null
    )
  );

create policy "profile_ratings_insert_own"
  on public.profile_ratings for insert
  with check (auth.uid() = viewer_id);

create policy "profile_ratings_update_own"
  on public.profile_ratings for update
  using (auth.uid() = viewer_id)
  with check (auth.uid() = viewer_id);

create policy "profile_ratings_delete_own"
  on public.profile_ratings for delete
  using (auth.uid() = viewer_id);

