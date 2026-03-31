alter table public.profiles
  add column if not exists verified boolean not null default false;

alter table public.profiles
  add column if not exists looking_for text;

alter table public.profiles
  add column if not exists prompt_1_question text;

alter table public.profiles
  add column if not exists prompt_1_answer text;

alter table public.profiles
  add column if not exists prompt_2_question text;

alter table public.profiles
  add column if not exists prompt_2_answer text;
