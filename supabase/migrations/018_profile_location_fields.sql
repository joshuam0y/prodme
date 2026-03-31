alter table public.profiles
  add column if not exists neighborhood text;

alter table public.profiles
  add column if not exists latitude double precision;

alter table public.profiles
  add column if not exists longitude double precision;

alter table public.profiles
  add column if not exists location_radius_km integer not null default 25;
