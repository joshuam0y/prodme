-- Optional public profile controls and external links (HTTPS URLs).

alter table public.profiles
  add column if not exists public_visibility jsonb not null default '{}'::jsonb,
  add column if not exists social_links jsonb not null default '[]'::jsonb;

comment on column public.profiles.public_visibility is
  'JSON object: optional keys member_details, location, goal, looking_for, prompts, niche, beats. Omitted or true = shown on public profile; false = hidden.';

comment on column public.profiles.social_links is
  'JSON array of up to 6 { "label": string, "url": string } with HTTPS URLs only.';
