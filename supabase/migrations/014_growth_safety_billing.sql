-- Growth analytics, trust/safety, and monetization scaffolding.

create table if not exists public.product_events (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete set null,
  event_name text not null check (char_length(event_name) >= 2),
  path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_events_event_name_created_idx
  on public.product_events (event_name, created_at desc);

create index if not exists product_events_user_created_idx
  on public.product_events (user_id, created_at desc);

alter table public.product_events enable row level security;

create policy "product_events_insert_own_or_anon"
  on public.product_events for insert
  with check (user_id is null or auth.uid() = user_id);

create policy "product_events_select_own"
  on public.product_events for select
  using (auth.uid() = user_id);

create table if not exists public.profile_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists profile_blocks_blocked_idx
  on public.profile_blocks (blocked_id, created_at desc);

alter table public.profile_blocks enable row level security;

create policy "profile_blocks_select_involved"
  on public.profile_blocks for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create policy "profile_blocks_insert_blocker"
  on public.profile_blocks for insert
  with check (auth.uid() = blocker_id);

create policy "profile_blocks_delete_blocker"
  on public.profile_blocks for delete
  using (auth.uid() = blocker_id);

create table if not exists public.match_message_reports (
  id bigserial primary key,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  message_id bigint references public.match_messages (id) on delete set null,
  reason text not null,
  details text,
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create index if not exists match_message_reports_reporter_created_idx
  on public.match_message_reports (reporter_id, created_at desc);

alter table public.match_message_reports enable row level security;

create policy "match_message_reports_insert_reporter"
  on public.match_message_reports for insert
  with check (auth.uid() = reporter_id);

create policy "match_message_reports_select_reporter"
  on public.match_message_reports for select
  using (auth.uid() = reporter_id);

create table if not exists public.billing_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  discover_daily_limit integer not null default 0,
  message_boost_limit integer not null default 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_entitlements enable row level security;

create policy "billing_entitlements_select_own"
  on public.billing_entitlements for select
  using (auth.uid() = user_id);

create policy "billing_entitlements_insert_own"
  on public.billing_entitlements for insert
  with check (auth.uid() = user_id);

create policy "billing_entitlements_update_own"
  on public.billing_entitlements for update
  using (auth.uid() = user_id);
