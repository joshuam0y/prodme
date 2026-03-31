-- Admin moderation policy support.

create table if not exists public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;

create policy "admin_emails_read_authenticated"
  on public.admin_emails for select
  using (auth.role() = 'authenticated');

create or replace function public.is_admin_email()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.admin_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "profile_blocks_select_involved" on public.profile_blocks;
create policy "profile_blocks_select_involved_or_admin"
  on public.profile_blocks for select
  using (
    auth.uid() = blocker_id
    or auth.uid() = blocked_id
    or public.is_admin_email()
  );

drop policy if exists "profile_blocks_delete_blocker" on public.profile_blocks;
create policy "profile_blocks_delete_blocker_or_admin"
  on public.profile_blocks for delete
  using (auth.uid() = blocker_id or public.is_admin_email());

drop policy if exists "match_message_reports_select_reporter" on public.match_message_reports;
create policy "match_message_reports_select_reporter_or_admin"
  on public.match_message_reports for select
  using (auth.uid() = reporter_id or public.is_admin_email());

create policy "match_message_reports_update_admin"
  on public.match_message_reports for update
  using (public.is_admin_email())
  with check (public.is_admin_email());
