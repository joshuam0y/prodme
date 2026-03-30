-- Beat previews for discover / public profiles.
-- Run in Supabase SQL Editor after 001 + 002.

alter table public.profiles
  add column if not exists star_beat_title text,
  add column if not exists star_beat_audio_url text,
  add column if not exists star_beat_cover_url text,
  add column if not exists extra_beats jsonb not null default '[]'::jsonb;

comment on column public.profiles.star_beat_title is 'Featured preview track title';
comment on column public.profiles.star_beat_audio_url is 'Public HTTPS URL to audio (e.g. Storage public URL)';
comment on column public.profiles.star_beat_cover_url is 'Cover art URL for star track';
comment on column public.profiles.extra_beats is 'JSON array: [{"title","audio_url","cover_url"}, ...] max 5 in app';

-- Public bucket: previews stream on discover / public profile.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  52428800,
  array[
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Paths: profile-media/{user_uuid}/filename.ext
drop policy if exists "profile_media_select_public" on storage.objects;
drop policy if exists "profile_media_insert_own" on storage.objects;
drop policy if exists "profile_media_update_own" on storage.objects;
drop policy if exists "profile_media_delete_own" on storage.objects;

create policy "profile_media_select_public"
  on storage.objects for select
  using (bucket_id = 'profile-media');

create policy "profile_media_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-media'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "profile_media_update_own"
  on storage.objects for update
  using (
    bucket_id = 'profile-media'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "profile_media_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'profile-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );
