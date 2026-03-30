-- Recipients must be able to mark incoming messages read (read_at) from the chat UI.
-- RLS on match_messages previously had only SELECT + INSERT, so updates were blocked.

create policy "match_messages_update_recipient_read"
  on public.match_messages for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- Prevent body/metadata edits via the client; only read_at may change.
create or replace function public.match_messages_enforce_read_at_only_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sender_id is distinct from old.sender_id
     or new.recipient_id is distinct from old.recipient_id
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'match_messages: only read_at may be updated';
  end if;
  return new;
end;
$$;

drop trigger if exists match_messages_read_at_only_update on public.match_messages;

create trigger match_messages_read_at_only_update
  before update on public.match_messages
  for each row
  execute procedure public.match_messages_enforce_read_at_only_update();
