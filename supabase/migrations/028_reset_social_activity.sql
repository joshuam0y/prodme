-- DESTRUCTIVE one-time reset: notifications, likes/swipes, DMs, pipeline, ratings, message reports.
-- Keeps: auth users, profiles, profile embeddings, blocks, billing, analytics events.
-- Apply via Supabase SQL editor or `supabase db push` only when you intend to wipe this data.

-- Reports reference match_messages; cascade clears both in one shot.
truncate table public.match_messages restart identity cascade;
truncate table public.notifications restart identity;
truncate table public.discover_swipes;
truncate table public.interested_pipeline;
truncate table public.lead_outreach;
truncate table public.profile_ratings;
