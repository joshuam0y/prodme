create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  kind text not null,
  title text not null,
  body text,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_read_created_idx
  on public.notifications (user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications_insert_own_or_actor"
  on public.notifications for insert
  with check (auth.uid() = user_id or auth.uid() = actor_id);

create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id);
