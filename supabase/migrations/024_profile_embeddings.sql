create extension if not exists vector;

create table if not exists public.profile_embeddings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  source_text text not null default '',
  embedding vector(1536) not null,
  updated_at timestamptz not null default now()
);

create index if not exists profile_embeddings_embedding_idx
  on public.profile_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.profile_embeddings enable row level security;

create policy "profile_embeddings_select_own"
  on public.profile_embeddings for select
  using (auth.uid() = user_id);

create policy "profile_embeddings_insert_own"
  on public.profile_embeddings for insert
  with check (auth.uid() = user_id);

create policy "profile_embeddings_update_own"
  on public.profile_embeddings for update
  using (auth.uid() = user_id);

create or replace function public.set_profile_embedding(
  p_user_id uuid,
  p_source_text text,
  p_embedding_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not allowed';
  end if;

  insert into public.profile_embeddings (user_id, source_text, embedding, updated_at)
  values (p_user_id, coalesce(p_source_text, ''), p_embedding_text::vector, now())
  on conflict (user_id) do update
    set source_text = excluded.source_text,
        embedding = excluded.embedding,
        updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.set_profile_embedding(uuid, text, text) from public;
grant execute on function public.set_profile_embedding(uuid, text, text) to authenticated;

create or replace function public.match_profile_embeddings(
  p_viewer_id uuid,
  p_limit integer default 48
)
returns table (
  user_id uuid,
  similarity double precision
)
language sql
security definer
set search_path = public
as $$
  select
    candidate.user_id,
    1 - (viewer.embedding <=> candidate.embedding) as similarity
  from public.profile_embeddings viewer
  join public.profile_embeddings candidate
    on candidate.user_id <> viewer.user_id
  where viewer.user_id = p_viewer_id
  order by viewer.embedding <=> candidate.embedding asc
  limit greatest(coalesce(p_limit, 48), 1);
$$;

revoke all on function public.match_profile_embeddings(uuid, integer) from public;
grant execute on function public.match_profile_embeddings(uuid, integer) to authenticated;
