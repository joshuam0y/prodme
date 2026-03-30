-- Read state for in-app match chat (unread badges / "your turn" cues).

alter table public.match_messages
  add column if not exists read_at timestamptz;

create index if not exists match_messages_recipient_read_idx
  on public.match_messages (recipient_id, read_at, created_at desc);
