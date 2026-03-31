-- Allow admin emails to view/update verified badges on profiles.
-- (Moderation panel uses this to toggle "verified" for other users.)

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_admin_email()
  );

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (
    auth.uid() = id
    or public.is_admin_email()
  )
  with check (
    auth.uid() = id
    or public.is_admin_email()
  );

