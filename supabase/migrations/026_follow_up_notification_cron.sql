create extension if not exists pg_cron;

create or replace function public.create_follow_up_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  with unread_nudges as (
    select
      n.user_id,
      n.kind,
      coalesce(n.metadata ->> 'reminderKey', '') as reminder_key
    from public.notifications n
    where n.kind in ('reply_nudge', 'new_match_nudge')
      and n.read_at is null
  ),
  mutual_matches as (
    select
      a.viewer_id as user_id,
      a.target_id as match_id,
      greatest(a.created_at, b.created_at) as mutual_at
    from public.discover_swipes a
    join public.discover_swipes b
      on b.viewer_id = a.target_id
     and b.target_id = a.viewer_id
    where a.action = 'save'
      and b.action = 'save'
  ),
  match_threads as (
    select
      least(m.sender_id, m.recipient_id) as pair_a,
      greatest(m.sender_id, m.recipient_id) as pair_b,
      max(m.created_at) as latest_created_at
    from public.match_messages m
    group by 1, 2
  ),
  match_latest as (
    select
      t.pair_a,
      t.pair_b,
      m.id,
      m.sender_id,
      m.recipient_id,
      m.created_at
    from match_threads t
    join public.match_messages m
      on least(m.sender_id, m.recipient_id) = t.pair_a
     and greatest(m.sender_id, m.recipient_id) = t.pair_b
     and m.created_at = t.latest_created_at
  ),
  new_match_candidates as (
    select
      mm.user_id,
      mm.match_id,
      mm.mutual_at,
      coalesce(p.display_name, 'Someone') as actor_name,
      'new_match:' || mm.match_id::text || ':' || mm.mutual_at::text as reminder_key
    from mutual_matches mm
    left join match_latest ml
      on ml.pair_a = least(mm.user_id, mm.match_id)
     and ml.pair_b = greatest(mm.user_id, mm.match_id)
    left join public.profiles p
      on p.id = mm.match_id
    where ml.id is null
      and mm.mutual_at <= now() - interval '12 hours'
  ),
  reply_candidates as (
    select
      ml.recipient_id as user_id,
      ml.sender_id as match_id,
      ml.id as last_message_id,
      ml.created_at as last_message_at,
      coalesce(p.display_name, 'Someone') as actor_name,
      'reply:' || ml.sender_id::text || ':' || ml.id::text as reminder_key
    from match_latest ml
    left join public.profiles p
      on p.id = ml.sender_id
    where ml.created_at <= now() - interval '6 hours'
  ),
  inserted_new_match as (
    insert into public.notifications (user_id, actor_id, kind, title, body, href, metadata)
    select
      c.user_id,
      c.match_id,
      'new_match_nudge',
      c.actor_name || ' is still a fresh match',
      'Send the first message before the momentum drops.',
      '/matches/' || c.match_id::text,
      jsonb_build_object(
        'reminderKey', c.reminder_key,
        'actorId', c.match_id,
        'mutualAt', c.mutual_at
      )
    from new_match_candidates c
    left join unread_nudges n
      on n.user_id = c.user_id
     and n.kind = 'new_match_nudge'
     and n.reminder_key = c.reminder_key
    where n.reminder_key is null
    returning 1
  ),
  inserted_reply as (
    insert into public.notifications (user_id, actor_id, kind, title, body, href, metadata)
    select
      c.user_id,
      c.match_id,
      'reply_nudge',
      c.actor_name || ' is waiting on your reply',
      'Jump back into the conversation while it is still warm.',
      '/matches/' || c.match_id::text,
      jsonb_build_object(
        'reminderKey', c.reminder_key,
        'actorId', c.match_id,
        'lastMessageId', c.last_message_id,
        'lastMessageAt', c.last_message_at
      )
    from reply_candidates c
    left join unread_nudges n
      on n.user_id = c.user_id
     and n.kind = 'reply_nudge'
     and n.reminder_key = c.reminder_key
    where n.reminder_key is null
    returning 1
  )
  select
    (select count(*) from inserted_new_match) +
    (select count(*) from inserted_reply)
  into inserted_count;

  return coalesce(inserted_count, 0);
end;
$$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'prodlink-follow-up-notifications';

select cron.schedule(
  'prodlink-follow-up-notifications',
  '15 * * * *',
  $$select public.create_follow_up_notifications();$$
);
