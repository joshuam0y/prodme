-- Allow users to see incoming likes (for Likes You / Matches),
-- while still hiding pass events from non-viewers.

create policy "discover_swipes_select_incoming_likes"
  on public.discover_swipes for select
  using (
    auth.uid() = target_id
    and action in ('save', 'interested')
  );
