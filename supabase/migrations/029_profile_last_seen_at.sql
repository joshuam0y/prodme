-- App activity for "Last seen" (separate from profile edits / discover `updated_at` sort).
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

comment on column public.profiles.last_seen_at is
  'Throttled client heartbeat while signed in; does not affect discover ordering.';

-- Reasonable initial value for existing rows (real heartbeat updates on next visit).
update public.profiles
set last_seen_at = coalesce(updated_at, onboarding_completed_at, created_at)
where last_seen_at is null;
