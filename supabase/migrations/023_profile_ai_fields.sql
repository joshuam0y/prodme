alter table public.profiles
  add column if not exists ai_summary text,
  add column if not exists ai_tags jsonb not null default '[]'::jsonb,
  add column if not exists ai_profile_score integer,
  add column if not exists ai_updated_at timestamptz;
