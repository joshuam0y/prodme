import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { discoverAccentGradientForRole, inferProfileRole } from "@/lib/discover-profiles";
import { beatsFromProfileRow } from "@/lib/profile-beats";
import { isVenueProfileRole } from "@/lib/profile-prompts";
import { roleLabel as profileRoleLabel } from "@/lib/role-label";
import { isUuid } from "@/lib/uuid";
import type { DbProfile } from "@/lib/types";
import { formatDisplayDate } from "@/lib/format-date";
import { isPublicFieldVisible } from "@/lib/public-visibility";
import { parseSocialLinks } from "@/lib/social-links";
import { ProfileAvatarModal, ProfileGallery, ProfileGalleryModal } from "./gallery";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ gallery?: string; avatar?: string }> };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function InfoSection({
  title,
  children,
  compact = false,
  accent = false,
  stacked = false,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
  accent?: boolean;
  /** When true, omit default top margin (parent uses gap). */
  stacked?: boolean;
}) {
  return (
    <section
      className={`${stacked ? "mt-0" : compact ? "mt-4" : "mt-6"} rounded-2xl border border-white/10 bg-zinc-900/40 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm`}
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
      "id, created_at, last_seen_at, updated_at, display_name, avatar_url, ai_summary, ai_tags, ai_profile_score, role, niche, goal, city, neighborhood, latitude, longitude, looking_for, prompt_1_question, prompt_1_answer, prompt_2_question, prompt_2_answer, onboarding_completed_at, star_beat_title, star_beat_audio_url, star_beat_cover_url, extra_beats, public_visibility, social_links",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row?.onboarding_completed_at) {
    notFound();
  }

  const profile = row as DbProfile;
  const visibility = profile.public_visibility;
  const isOwn = viewer?.id === id;
  const name = profile.display_name?.trim() || "Member";
  const showMemberDetails = isOwn || isPublicFieldVisible("member_details", visibility);
  const showLocation = isOwn || isPublicFieldVisible("location", visibility);
  const showGoal = isOwn || isPublicFieldVisible("goal", visibility);
  const showLookingFor = isOwn || isPublicFieldVisible("looking_for", visibility);
  const showPrompts = isOwn || isPublicFieldVisible("prompts", visibility);
  const showNichePublic = isOwn || isPublicFieldVisible("niche", visibility);
  const showBeats = isOwn || isPublicFieldVisible("beats", visibility);
  const socialLinks = parseSocialLinks(profile.social_links);
  const { starBeat, extraBeats } = beatsFromProfileRow({
    id: profile.id,
    star_beat_title: profile.star_beat_title ?? null,
    star_beat_audio_url: profile.star_beat_audio_url ?? null,
    star_beat_cover_url: profile.star_beat_cover_url ?? null,
    extra_beats: profile.extra_beats,
  });

  const isVenueProfile = isVenueProfileRole(profile.role);
  const anyExtraAudio = Boolean(extraBeats?.some((b) => Boolean(b.audioUrl)));
  const galleryOpen = sp.gallery === "1";
  const avatarOpen = sp.avatar === "1";
  const prompt1Question =
    showPrompts && profile.prompt_1_question?.trim() ? profile.prompt_1_question.trim() : null;
  const prompt1Answer =
    showPrompts && profile.prompt_1_answer?.trim() ? profile.prompt_1_answer.trim() : null;
  const prompt2Question =
    showPrompts && profile.prompt_2_question?.trim() ? profile.prompt_2_question.trim() : null;
  const prompt2Answer =
    showPrompts && profile.prompt_2_answer?.trim() ? profile.prompt_2_answer.trim() : null;
  const lookingFor = showLookingFor ? profile.looking_for?.trim() || null : null;
  const goal = showGoal ? profile.goal?.trim() || null : null;
  const niche = showNichePublic ? profile.niche?.trim() || null : null;
  /** Same semantics as discover cards: pill uses goal, else niche (`getLiveProfileCards` → `focus`). */
  const focusLabel = goal || niche || null;
  const discoverRole = inferProfileRole(profile.role);
  const discoverCityLabel = profile.neighborhood?.trim() || profile.city?.trim() || null;
  let distanceKm: number | undefined;
  if (
    showLocation &&
    viewer?.id &&
    viewer.id !== id &&
    typeof profile.latitude === "number" &&
    typeof profile.longitude === "number"
  ) {
    const { data: viewerLoc } = await supabase
      .from("profiles")
      .select("latitude, longitude")
      .eq("id", viewer.id)
      .maybeSingle();
    const vLat = viewerLoc?.latitude;
    const vLng = viewerLoc?.longitude;
    if (typeof vLat === "number" && typeof vLng === "number") {
      distanceKm = haversineKm(vLat, vLng, profile.latitude, profile.longitude);
    }
  }
  const metaLine = [
    profileRoleLabel(profile.role),
    showLocation ? discoverCityLabel : null,
    showLocation && distanceKm !== undefined ? `${Math.round(distanceKm)} km away` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  /** Discover shows raw niche as the subtitle under the header when a star beat exists. */
  const discoverBioLine = showBeats && starBeat && niche ? niche : null;
  const showNicheSection = Boolean(niche) && showNichePublic && !(showBeats && starBeat && niche);
  const lookingForTitle = isVenueProfile ? "Booking fit" : "Looking for";
  const goalTitle = isVenueProfile ? "What they're building" : "Current focus";
  const nicheTitle = isVenueProfile ? "Venue vibe" : "Sound";
  const promptLeadTitle = isVenueProfile ? "Room Q&A" : "Featured prompt";
  const promptFollowTitle = isVenueProfile ? "More from the room" : "More personality";
  const galleryTitle = isVenueProfile ? "Venue gallery" : "Gallery";
  const highlightTitle = isVenueProfile ? "Photo highlight" : starBeat?.audioUrl ? "Featured track" : "Featured photo";
  const collectionTitle = isVenueProfile ? "More photos" : anyExtraAudio ? "More tracks" : "More photos";
  const lookingForSection = lookingFor ? (
    <InfoSection title={lookingForTitle} stacked>
      {lookingFor}
    </InfoSection>
  ) : null;
  const prompt1Section = prompt1Question && prompt1Answer ? (
    <InfoSection title={promptLeadTitle} accent stacked>
      <h3 className="text-sm font-semibold text-zinc-100">{prompt1Question}</h3>
      <p className="mt-2">{prompt1Answer}</p>
    </InfoSection>
  ) : null;
  const prompt2Section = prompt2Question && prompt2Answer ? (
    <InfoSection title={promptFollowTitle} compact stacked>
      <h3 className="text-sm font-semibold text-zinc-100">{prompt2Question}</h3>
      <p className="mt-2">{prompt2Answer}</p>
    </InfoSection>
  ) : null;
  const goalSection = goal ? (
    <section>
      <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {goalTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
        {goal}
      </p>
    </section>
  ) : null;
  const nicheSection = showNicheSection ? (
    <section>
      <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {nicheTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
        {niche}
      </p>
    </section>
  ) : null;
  const memberDetailsSection = showMemberDetails ? (
    <InfoSection title="Member details" compact>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Signed up</p>
          <p className="mt-1 text-sm text-zinc-100">
            {formatDisplayDate(profile.created_at ?? profile.onboarding_completed_at)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Last seen</p>
          <p className="mt-1 text-sm text-zinc-100">
            {formatDisplayDate(
              profile.last_seen_at ?? profile.updated_at ?? profile.onboarding_completed_at,
            )}
          </p>
        </div>
      </div>
    </InfoSection>
  ) : null;
  const galleryItems = [
    ...(profile.avatar_url?.trim() ? [{ url: profile.avatar_url.trim(), label: `${name} profile photo` }] : []),
    ...(showBeats && starBeat?.coverUrl ? [{ url: starBeat.coverUrl, label: starBeat.title }] : []),
    ...(showBeats
      ? (extraBeats ?? []).filter((b) => Boolean(b.coverUrl)).map((b) => ({ url: b.coverUrl, label: b.title }))
      : []),
  ];
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
          className={`h-32 bg-gradient-to-br ${discoverAccentGradientForRole(discoverRole)} opacity-90`}
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
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{name}</h1>
          {focusLabel ? (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-zinc-200 sm:text-xs">
              {focusLabel}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-zinc-300 sm:text-base">{metaLine}</p>
        {discoverBioLine ? (
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-200">{discoverBioLine}</p>
        ) : null}
        {socialLinks.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {socialLinks.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-amber-300/95 transition hover:border-amber-500/35 hover:bg-amber-500/10"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {isOwn ? (
          <p className="mt-3 inline-flex max-w-fit rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200/90">
            Your public profile view
          </p>
        ) : null}
      </div>

      {showBeats && starBeat ? (
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

      {showBeats && extraBeats?.length ? (
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

      {(lookingForSection || prompt1Section || prompt2Section || goalSection || nicheSection) ? (
        <div className="mt-8 flex flex-col gap-6">
          {lookingForSection}
          {prompt1Section}
          {prompt2Section}
          {goalSection}
          {nicheSection}
        </div>
      ) : null}

      {memberDetailsSection ? <div className="mt-10">{memberDetailsSection}</div> : null}

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
