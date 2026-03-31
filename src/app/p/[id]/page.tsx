import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { beatsFromProfileRow } from "@/lib/profile-beats";
import { isUuid } from "@/lib/uuid";
import type { DbProfile } from "@/lib/types";
import { StarRatingDisplay } from "@/components/star-rating-display";
import { ProfileGallery, ProfileGalleryModal } from "./gallery";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ gallery?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id) || !isSupabaseConfigured()) {
    return { title: "Profile" };
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("profiles")
    .select("display_name, niche")
    .eq("id", id)
    .not("onboarding_completed_at", "is", null)
    .maybeSingle();

  const p = row as Pick<DbProfile, "display_name" | "niche"> | null;
  const name = p?.display_name?.trim() || "Member";
  const title = p ? `${name} on prodLink` : "Profile";
  const description = p?.niche?.trim() || "Music profile on prodLink";

  return {
    title: p ? name : "Profile",
    description,
    openGraph: { title, description },
  };
}

export default async function PublicProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  if (!isUuid(id) || !isSupabaseConfigured()) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: row, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, ai_summary, ai_tags, ai_profile_score, role, niche, goal, city, neighborhood, verified, looking_for, prompt_1_question, prompt_1_answer, prompt_2_question, prompt_2_answer, onboarding_completed_at, star_beat_title, star_beat_audio_url, star_beat_cover_url, extra_beats",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row?.onboarding_completed_at) {
    notFound();
  }

  const profile = row as DbProfile;
  const isOwn = viewer?.id === id;
  const name = profile.display_name?.trim() || "Member";
  const { starBeat, extraBeats } = beatsFromProfileRow({
    id: profile.id,
    star_beat_title: profile.star_beat_title ?? null,
    star_beat_audio_url: profile.star_beat_audio_url ?? null,
    star_beat_cover_url: profile.star_beat_cover_url ?? null,
    extra_beats: profile.extra_beats,
  });

  const viewerId = viewer?.id ?? null;
  const isVenueProfile =
    profile.role?.toLowerCase().includes("venue") ||
    profile.role?.toLowerCase().includes("promoter");
  const aiTags = Array.isArray(profile.ai_tags)
    ? profile.ai_tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : [];
  const anyExtraAudio = Boolean(extraBeats?.some((b) => Boolean(b.audioUrl)));
  const galleryOpen = sp.gallery === "1";
  const galleryItems = [
    ...(profile.avatar_url?.trim() ? [{ url: profile.avatar_url.trim(), label: `${name} profile photo` }] : []),
    ...(starBeat?.coverUrl ? [{ url: starBeat.coverUrl, label: starBeat.title }] : []),
    ...((extraBeats ?? []).filter((b) => Boolean(b.coverUrl)).map((b) => ({ url: b.coverUrl, label: b.title }))),
  ];
  let ratingAvg: number | null = null;
  let ratingCount = 0;
  let viewerRating: number | null = null;
  let ratingsDisabled = false;

  try {
    const { data: ratingRows } = await supabase
      .from("profile_ratings")
      .select("rating")
      .eq("target_id", id);
    ratingCount = ratingRows?.length ?? 0;
    ratingAvg =
      ratingCount > 0
        ? ratingRows!.reduce((sum, r) => sum + r.rating, 0) / ratingCount
        : null;

    if (viewerId) {
      const { data: myRow } = await supabase
        .from("profile_ratings")
        .select("rating")
        .eq("viewer_id", viewerId)
        .eq("target_id", id)
        .maybeSingle();
      if (myRow?.rating) viewerRating = myRow.rating;
    }
  } catch {
    // Ratings are optional; if the table doesn't exist yet, just hide the section.
    ratingAvg = null;
    ratingCount = 0;
    viewerRating = null;
    ratingsDisabled = true;
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      {galleryOpen ? <ProfileGalleryModal profileId={id} items={galleryItems} /> : null}
      <div
        className={`mb-8 h-32 rounded-2xl bg-gradient-to-br ${
          profile.role?.toLowerCase().includes("producer")
            ? "from-violet-600 to-fuchsia-600"
            : profile.role?.toLowerCase().includes("dj")
              ? "from-amber-500 to-orange-600"
              : profile.role?.toLowerCase().includes("venue") ||
                  profile.role?.toLowerCase().includes("promoter")
                ? "from-slate-600 to-zinc-700"
                : "from-emerald-600 to-teal-600"
        } opacity-90`}
        aria-hidden
      />

      {isOwn ? (
        <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-200/90">
          This is your public profile — what others see when you share your link.
        </p>
      ) : null}

      {profile.avatar_url?.trim() ? (
        <div className="mb-6 flex justify-center">
          <Link
            href={`/p/${id}?gallery=1#img-0`}
            className="relative h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-zinc-900/40 ring-1 ring-white/10 transition hover:ring-amber-500/40"
            aria-label="Open profile photo"
          >
            <Image
              src={profile.avatar_url.trim()}
              alt={`${name} profile photo`}
              fill
              className="object-cover"
              unoptimized={profile.avatar_url.includes("picsum.photos")}
            />
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          {name}
        </h1>
        <p className="text-sm text-zinc-400">
          {profile.role ?? "Creator"}
          {profile.neighborhood?.trim()
            ? ` · ${profile.neighborhood.trim()}`
            : profile.city?.trim()
              ? ` · ${profile.city.trim()}`
              : null}
          {profile.niche ? ` · ${profile.niche}` : null}
          {profile.verified ? " · Verified" : null}
        </p>
      </div>

      {profile.ai_summary?.trim() || aiTags.length > 0 || typeof profile.ai_profile_score === "number" ? (
        <section className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-emerald-300/90">
              AI summary
            </h2>
            {typeof profile.ai_profile_score === "number" ? (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-500/30">
                Score {profile.ai_profile_score}/100
              </span>
            ) : null}
          </div>
          {profile.ai_summary?.trim() ? (
            <p className="mt-3 text-sm leading-relaxed text-zinc-200">
              {profile.ai_summary.trim()}
            </p>
          ) : null}
          {aiTags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {aiTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {profile.looking_for?.trim() ? (
        <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Looking for
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-200">
            {profile.looking_for.trim()}
          </p>
        </section>
      ) : null}

      {profile.prompt_1_question?.trim() && profile.prompt_1_answer?.trim() ? (
        <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-500/90">
            Prompt
          </p>
          <h2 className="mt-2 text-sm font-semibold text-zinc-100">
            {profile.prompt_1_question.trim()}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-200">
            {profile.prompt_1_answer.trim()}
          </p>
        </section>
      ) : null}

      {profile.prompt_2_question?.trim() && profile.prompt_2_answer?.trim() ? (
        <section className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-100">
            {profile.prompt_2_question.trim()}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-200">
            {profile.prompt_2_answer.trim()}
          </p>
        </section>
      ) : null}

      {profile.goal ? (
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Focus
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {profile.goal}
          </p>
        </section>
      ) : null}

      {profile.niche ? (
        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Niche
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {profile.niche}
          </p>
        </section>
      ) : null}

      {ratingsDisabled ? (
        <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-amber-500/90">
            Community rating
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Ratings are disabled for now. Run the latest Supabase migration (
            <code className="text-xs text-zinc-300">006_profile_ratings.sql</code>).
          </p>
        </section>
      ) : ratingAvg !== null ? (
        <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-amber-500/90">
            Community rating
          </h2>
          <div className="mt-3">
            <StarRatingDisplay average={ratingAvg} count={ratingCount} />
          </div>
          {viewerRating !== null ? (
            <p className="mt-2 text-xs text-zinc-400">
              You rated this profile {viewerRating}★
            </p>
          ) : null}
        </section>
      ) : null}

      {starBeat ? (
        isVenueProfile ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-amber-500/90">
              Photo highlight
            </h2>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-white/10">
                <Image
                  src={starBeat.coverUrl}
                  alt=""
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                  unoptimized={starBeat.coverUrl.includes("picsum.photos")}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-100">{starBeat.title}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Venue photos — swipe/discover for more.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-amber-500/90">
              {starBeat.audioUrl ? "Star track" : "Featured photo"}
            </h2>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-white/10">
                <Image
                  src={starBeat.coverUrl}
                  alt=""
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                  unoptimized={starBeat.coverUrl.includes("picsum.photos")}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-100">{starBeat.title}</p>
                {starBeat.audioUrl ? (
                  <audio
                    controls
                    preload="none"
                    src={starBeat.audioUrl}
                    className="mt-2 h-9 w-full max-w-md"
                  >
                    <track kind="captions" />
                  </audio>
                ) : null}
              </div>
            </div>
          </section>
        )
      ) : null}

      {extraBeats?.length ? (
        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {isVenueProfile ? "More photos" : anyExtraAudio ? "More beats" : "More photos"}
          </h2>
          <ul className="mt-3 space-y-3">
            {extraBeats.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-zinc-950/40 px-3 py-2"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                  <Image
                    src={b.coverUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    unoptimized={b.coverUrl.includes("picsum.photos")}
                  />
                </div>
                <span className="min-w-0 flex-1 text-sm text-zinc-200">{b.title}</span>
                {profile.role?.toLowerCase().includes("venue") ||
                profile.role?.toLowerCase().includes("promoter") ? null : b.audioUrl ? (
                  <audio
                    controls
                    preload="none"
                    src={b.audioUrl}
                    className="h-8 w-full sm:w-48"
                  >
                    <track kind="captions" />
                  </audio>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ProfileGallery profileId={id} items={galleryItems} />

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/explore"
          className="inline-flex justify-center rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
        >
          Back to Discover
        </Link>
        {viewer ? (
          <Link
            href="/profile"
            className="inline-flex justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Your profile
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Sign in
          </Link>
        )}
      </div>
    </main>
  );
}
