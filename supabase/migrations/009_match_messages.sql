-- In-app chat messages for mutual matches.

create table if not exists public.match_messages (
  id bigserial primary key,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists match_messages_sender_created_idx
  on public.match_messages (sender_id, created_at desc);

create index if not exists match_messages_recipient_created_idx
  on public.match_messages (recipient_id, created_at desc);

alter table public.match_messages enable row level security;

create policy "match_messages_select_participant"
  on public.match_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "match_messages_insert_sender"
  on public.match_messages for insert
  with check (auth.uid() = sender_id);
