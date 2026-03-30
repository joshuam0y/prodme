-- Single positive outcome: "save" (star). Former "interested" rows become "save".

update public.discover_swipes
set action = 'save'
where action = 'interested';

alter table public.discover_swipes
  drop constraint if exists discover_swipes_action_check;

alter table public.discover_swipes
  add constraint discover_swipes_action_check
  check (action in ('pass', 'save'));

drop policy if exists discover_swipes_select_incoming_likes on public.discover_swipes;

create policy "discover_swipes_select_incoming_likes"
  on public.discover_swipes for select
  using (
    auth.uid() = target_id
    and action = 'save'
  );
