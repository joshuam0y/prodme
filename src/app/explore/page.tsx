import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SwipeStack } from "@/components/swipe-stack";
import { DiscoverFilterBar } from "@/components/discover-filter-bar";
import { getLiveProfileCards, inferProfileRole } from "@/lib/discover-profiles";
import { trackServerEvent } from "@/lib/analytics";
import { roleLabel } from "@/lib/role-label";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isProfileQuestionnaireComplete } from "@/lib/profile-completion";
import type { Role } from "@/lib/types";

type DiscoverGroup = "creatives" | "venues";

function isGroup(s: string | undefined): s is DiscoverGroup | "" {
  return s === "" || s === "creatives" || s === "venues";
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; notice?: string; maxKm?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const groupFilter = isGroup(params.group) ? params.group : "";
  const notice = params.notice ? decodeURIComponent(params.notice) : null;
  const maxKm = Math.max(1, Math.min(200, Number(params.maxKm ?? 50) || 50));
  const sortRaw = (params.sort ?? "").toLowerCase();
  const sort =
    sortRaw === "nearby" || sortRaw === "new" || sortRaw === "trending"
      ? (sortRaw as "nearby" | "new" | "trending")
      : "new";

  let viewerId: string | null = null;
  let viewerRole: Role | null = null;
  let viewerNiche: string | null = null;
  let viewerGoal: string | null = null;
  let viewerLookingFor: string | null = null;
  let viewerLat: number | null = null;
  let viewerLng: number | null = null;
  let likedYouIds = new Set<string>();
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    viewerId = user?.id ?? null;
    if (!viewerId) {
      const nextPath = `/explore${
        groupFilter ? `?group=${encodeURIComponent(groupFilter)}` : ""
      }`;
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("role, niche, goal, looking_for, onboarding_completed_at, latitude, longitude")
      .eq("id", viewerId)
      .maybeSingle();
    if (prof?.role?.trim()) {
      viewerRole = inferProfileRole(prof.role);
    }
    viewerNiche = prof?.niche?.trim() ?? null;
    viewerGoal = prof?.goal?.trim() ?? null;
    viewerLookingFor = prof?.looking_for?.trim() ?? null;
    if (!isProfileQuestionnaireComplete(prof)) {
      redirect("/onboarding");
    }
    viewerLat = prof?.latitude ?? null;
    viewerLng = prof?.longitude ?? null;
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("onboarding_completed_at", "is", null);
    void count;
    const { data: likedRows } = await supabase
      .from("discover_swipes")
      .select("viewer_id")
      .eq("target_id", viewerId)
      .eq("action", "save");
    likedYouIds = new Set((likedRows ?? []).map((r) => r.viewer_id as string));
  }

  // Venues can only see creatives. If they request "Venues" filter, send them back.
  if (viewerRole === "venue" && groupFilter === "venues") {
    redirect("/explore?group=creatives&sort=new");
  }

  const live = await getLiveProfileCards(viewerId, viewerId, {
    viewerLat,
    viewerLng,
    viewerRole,
    viewerNiche,
    viewerGoal,
    viewerLookingFor,
    maxDistanceKm: maxKm,
    sort,
  });
  const peerFiltered =
    viewerRole === "venue"
      ? live.filter((p) => p.role !== "venue")
      : live;
  const profilesFiltered =
    groupFilter === "creatives"
      ? peerFiltered.filter((p) => p.role !== "venue")
      : groupFilter === "venues"
        ? peerFiltered.filter((p) => p.role === "venue")
        : peerFiltered;
  const profiles = [...profilesFiltered]
    .map((p, index) => ({ p, index }))
    .sort((a, b) => {
      const aL = likedYouIds.has(a.p.id);
      const bL = likedYouIds.has(b.p.id);
      if (aL !== bL) return aL ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ p }) => ({
      ...p,
      likedYou: likedYouIds.has(p.id),
    }));
  const recommendedProfiles = [...profiles]
    .filter((p) => typeof p.semanticScore === "number" && (p.semanticScore ?? 0) >= 0.72)
    .sort((a, b) => (b.semanticScore ?? 0) - (a.semanticScore ?? 0))
    .slice(0, 3);
  const effectiveGroupFilter =
    viewerRole === "venue" && groupFilter === "" ? "creatives" : groupFilter;
  const activeSummary = [
    effectiveGroupFilter === "creatives"
      ? "showing creatives"
      : effectiveGroupFilter === "venues"
        ? "showing venues"
        : null,
    sort !== "new" ? `sorted by ${sort}` : null,
    maxKm !== 50 ? `within ${maxKm} km` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  await trackServerEvent({
    event: "discover_opened",
    path: `/explore${effectiveGroupFilter ? `?group=${effectiveGroupFilter}` : ""}`,
    metadata: { groupFilter: effectiveGroupFilter || "all" },
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-5 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              Discover
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-500">
              {viewerId ? (
                <>
                  Swipe through active prodLink profiles, open any card for the full profile, and keep
                  the momentum going.
                  {viewerRole === "venue" ? " Your feed stays focused on creatives." : null}
                </>
              ) : (
                <>
                  Add Supabase in{" "}
                  <code className="text-zinc-600 dark:text-zinc-400">.env.local</code>, then{" "}
                  <Link
                    href="/signup?next=/explore"
                    className="text-amber-400/95 underline-offset-2 hover:underline"
                  >
                    sign up
                  </Link>{" "}
                  for Discover, Likes, and Messages.
                </>
              )}
            </p>
          </div>
        </div>
        {notice ? (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-950 dark:text-amber-100">
            {notice}
          </p>
        ) : null}
        <DiscoverFilterBar
          key={`${groupFilter || "all"}-${sort}-${maxKm}`}
          initialGroup={effectiveGroupFilter}
          initialSort={sort}
          initialKm={maxKm}
          allowVenueFilter={viewerRole !== "venue"}
        />
        {activeSummary ? (
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-500">
            Active: <span className="text-zinc-800 dark:text-zinc-300">{activeSummary}</span>
          </p>
        ) : null}
      </div>

      {recommendedProfiles.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recommended for you</h2>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-500 sm:text-sm">
                Closest semantic matches based on your full profile.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-600/25 dark:text-emerald-200 dark:ring-emerald-500/30">
              AI
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recommendedProfiles.map((profile) => (
              <Link
                key={`recommended-${profile.id}`}
                href={`/p/${profile.id}`}
                className="flex gap-3 rounded-xl border border-zinc-300/80 bg-white/80 p-3 transition hover:border-zinc-400/90 hover:bg-white dark:border-white/10 dark:bg-zinc-950/40 dark:hover:border-white/20 dark:hover:bg-white/[0.03] sm:p-4"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/10">
                  {profile.starBeat?.coverUrl?.trim() ? (
                    <Image
                      src={profile.starBeat.coverUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                      unoptimized={profile.starBeat.coverUrl.includes("picsum.photos")}
                    />
                  ) : profile.avatarUrl?.trim() ? (
                    <Image
                      src={profile.avatarUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                      unoptimized={profile.avatarUrl.includes("picsum.photos")}
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${profile.accent} text-[10px] font-semibold text-white/90`}
                    >
                      {roleLabel(profile.role).slice(0, 2)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{profile.displayName}</p>
                    <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-500">
                      {roleLabel(profile.role)} · {profile.city}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-200/90 px-2 py-0.5 text-[10px] font-medium text-zinc-800 dark:bg-white/5 dark:text-zinc-300">
                    {Math.round((profile.semanticScore ?? 0) * 100)}%
                  </span>
                </div>
                {profile.matchWhy?.[0] ? (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {profile.matchWhy[0]}
                  </p>
                ) : null}
                {profile.aiTags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.aiTags.slice(0, 3).map((tag) => (
                      <span
                        key={`${profile.id}-${tag}`}
                        className="rounded-full border border-zinc-300/80 bg-zinc-100/90 px-2 py-0.5 text-[10px] font-medium text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <SwipeStack
        key={`${groupFilter || "all"}-${viewerRole ?? "?"}`}
        profiles={profiles}
        viewerId={viewerId}
      />
    </main>
  );
}
