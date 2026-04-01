import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { beatsFromProfileRow } from "@/lib/profile-beats";
import { isVenueProfileRole } from "@/lib/profile-prompts";
import { isUuid } from "@/lib/uuid";
import type { DbProfile } from "@/lib/types";
import { StarRatingDisplay } from "@/components/star-rating-display";
import { ProfileAvatarModal, ProfileGallery, ProfileGalleryModal } from "./gallery";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ gallery?: string; avatar?: string }> };

function InfoSection({
  title,
  children,
  compact = false,
  accent = false,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
  accent?: boolean;
}) {
  return (
    <section
      className={`${compact ? "mt-4" : "mt-6"} rounded-2xl border border-white/10 bg-zinc-900/40 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm`}
    >
      <h2
        className={`text-xs font-medium uppercase tracking-wider ${
          accent ? "text-amber-500/90" : "text-zinc-500"
        }`}
      >
        {title}
      </h2>
      <div className="mt-2 text-sm leading-relaxed text-zinc-200">{children}</div>
    </section>
  );
}

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
      "id, display_name, avatar_url, ai_summary, ai_tags, ai_profile_score, role, niche, goal, city, neighborhood, looking_for, prompt_1_question, prompt_1_answer, prompt_2_question, prompt_2_answer, onboarding_completed_at, star_beat_title, star_beat_audio_url, star_beat_cover_url, extra_beats",
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
  const isVenueProfile = isVenueProfileRole(profile.role);
  const anyExtraAudio = Boolean(extraBeats?.some((b) => Boolean(b.audioUrl)));
  const galleryOpen = sp.gallery === "1";
  const avatarOpen = sp.avatar === "1";
  const prompt1Question = profile.prompt_1_question?.trim() || null;
  const prompt1Answer = profile.prompt_1_answer?.trim() || null;
  const prompt2Question = profile.prompt_2_question?.trim() || null;
  const prompt2Answer = profile.prompt_2_answer?.trim() || null;
  const lookingFor = profile.looking_for?.trim() || null;
  const goal = profile.goal?.trim() || null;
  const niche = profile.niche?.trim() || null;
  const heroUsesPrompt1 = Boolean(prompt1Question && prompt1Answer);
  const heroIntro = isVenueProfile
    ? lookingFor || prompt1Answer || goal || niche || null
    : prompt1Answer || lookingFor || goal || niche || null;
  const heroEyebrow = isVenueProfile
    ? lookingFor
      ? "Booking fit"
      : prompt1Question
        ? "Room personality"
        : goal
          ? "Current focus"
          : niche
            ? "Venue vibe"
            : null
    : prompt1Question
      ? "Featured answer"
      : lookingFor
        ? "Looking for"
        : goal
          ? "Current focus"
          : niche
            ? "About"
            : null;
  const heroSupport = isVenueProfile
    ? niche || goal
    : goal || niche;
  const heroChips = [
    profile.role?.trim() || null,
    profile.city?.trim() || null,
    isVenueProfile ? goal : niche,
  ].filter((value): value is string => Boolean(value));
  const locationLabel = profile.neighborhood?.trim() || profile.city?.trim() || null;
  const metaBits = [
    profile.role?.trim() || "Creator",
    locationLabel,
  ].filter((value): value is string => Boolean(value));
  const lookingForTitle = isVenueProfile ? "Booking fit" : "Looking for";
  const goalTitle = isVenueProfile ? "What they're building" : "Focus";
  const nicheTitle = isVenueProfile ? "Venue vibe" : "Sound";
  const promptLeadTitle = isVenueProfile ? "Room Q&A" : "Featured prompt";
  const promptFollowTitle = isVenueProfile ? "More from the room" : "More personality";
  const galleryTitle = isVenueProfile ? "Venue gallery" : "Gallery";
  const highlightTitle = isVenueProfile ? "Photo highlight" : starBeat?.audioUrl ? "Featured track" : "Featured photo";
  const collectionTitle = isVenueProfile ? "More photos" : anyExtraAudio ? "More tracks" : "More photos";
  const lookingForSection = lookingFor ? <InfoSection title={lookingForTitle}>{lookingFor}</InfoSection> : null;
  const prompt1Section = prompt1Question && prompt1Answer && !heroUsesPrompt1 ? (
    <InfoSection title={promptLeadTitle} accent>
      <h3 className="text-sm font-semibold text-zinc-100">{prompt1Question}</h3>
      <p className="mt-2">{prompt1Answer}</p>
    </InfoSection>
  ) : null;
  const prompt2Section = prompt2Question && prompt2Answer ? (
    <InfoSection title={promptFollowTitle} compact>
      <h3 className="text-sm font-semibold text-zinc-100">{prompt2Question}</h3>
      <p className="mt-2">{prompt2Answer}</p>
    </InfoSection>
  ) : null;
  const goalSection = goal ? (
    <section className="mt-8">
      <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {goalTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
        {goal}
      </p>
    </section>
  ) : null;
  const nicheSection = niche ? (
    <section className="mt-6">
      <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {nicheTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
        {niche}
      </p>
    </section>
  ) : null;
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
      {avatarOpen && profile.avatar_url?.trim() ? (
        <ProfileAvatarModal
          profileId={id}
          imageUrl={profile.avatar_url.trim()}
          label={`${name} profile photo`}
        />
      ) : null}
      <div className="relative mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900/40 shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
        <div
          className={`h-32 bg-gradient-to-br ${
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_30%)]" />
      </div>

      {profile.avatar_url?.trim() ? (
        <div className="-mt-20 mb-6 flex justify-center">
          <Link
            href={`/p/${id}?avatar=1`}
            className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-zinc-950 bg-zinc-900/40 shadow-[0_18px_60px_rgba(0,0,0,0.35)] ring-1 ring-white/10 transition hover:ring-amber-500/40"
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
          {metaBits.join(" · ")}
        </p>
        {isOwn ? (
          <p className="mt-3 inline-flex max-w-fit rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200/90">
            Your public profile view
          </p>
        ) : null}
      </div>

      {heroIntro ? (
        <section className="mt-6 rounded-[28px] border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-6 shadow-[0_14px_50px_rgba(245,158,11,0.08)]">
          {heroEyebrow ? (
            <p className="text-xs font-medium uppercase tracking-wider text-amber-300/90">
              {heroEyebrow}
            </p>
          ) : null}
          {heroUsesPrompt1 && prompt1Question ? (
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
              {prompt1Question}
            </h2>
          ) : null}
          <p className="mt-2 text-xl leading-relaxed text-zinc-100 sm:text-[1.4rem]">
            {heroIntro}
          </p>
          {heroSupport && heroSupport !== heroIntro ? (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-300">
              {heroSupport}
            </p>
          ) : null}
          {heroChips.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {heroChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-amber-500/20 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-200"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {isVenueProfile ? (
        <>
          {lookingForSection}
          {goalSection}
          {nicheSection}
          {prompt1Section}
          {prompt2Section}
        </>
      ) : (
        <>
          {prompt1Section}
          {prompt2Section}
          {lookingForSection}
          {goalSection}
          {nicheSection}
        </>
      )}

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
              {highlightTitle}
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
              {highlightTitle}
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
            {collectionTitle}
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

      <ProfileGallery profileId={id} items={galleryItems} title={galleryTitle} />

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
