-- Allow anyone (anon + authenticated) to read profiles that finished onboarding,
-- so public URLs like /p/:uuid work for discovery.

create policy "profiles_select_public_completed"
  on public.profiles for select
  using (onboarding_completed_at is not null);
