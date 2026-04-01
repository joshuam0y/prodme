import Link from "next/link";
import { redirect } from "next/navigation";
import { SwipeStack } from "@/components/swipe-stack";
import { DistanceFilter } from "@/components/distance-filter";
import { DiscoverFilterBar } from "@/components/discover-filter-bar";
import { getLiveProfileCards, inferProfileRole } from "@/lib/discover-profiles";
import { trackServerEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isProfileQuestionnaireComplete } from "@/lib/profile-completion";
import type { Role } from "@/lib/types";

type DiscoverGroup = "creatives" | "venues";

const FILTERS: { group: DiscoverGroup | ""; label: string }[] = [
  { group: "", label: "All" },
  { group: "creatives", label: "Creatives" },
  { group: "venues", label: "Venues" },
];

function isGroup(s: string | undefined): s is DiscoverGroup | "" {
  return s === "" || s === "creatives" || s === "venues";
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; notice?: string; maxKm?: string; sort?: string; verified?: string; q?: string }>;
}) {
  const params = await searchParams;
  const groupFilter = isGroup(params.group) ? params.group : "";
  const notice = params.notice ? decodeURIComponent(params.notice) : null;
  const maxKm = Math.max(1, Math.min(200, Number(params.maxKm ?? 50) || 50));
  const sortRaw = (params.sort ?? "").toLowerCase();
  const sort =
    sortRaw === "nearby" || sortRaw === "new" || sortRaw === "trending"
      ? (sortRaw as "nearby" | "new" | "trending")
      : "trending";
  const verifiedOnly = params.verified === "1";
  const lookingForQ = params.q ? decodeURIComponent(params.q) : "";

  let viewerId: string | null = null;
  let viewerRole: Role | null = null;
  let viewerNiche: string | null = null;
  let viewerGoal: string | null = null;
  let viewerLookingFor: string | null = null;
  let viewerLat: number | null = null;
  let viewerLng: number | null = null;
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
  }

  // Venues can only see creatives. If they request "Venues" filter, send them back.
  if (viewerRole === "venue" && groupFilter === "venues") {
    redirect("/explore?group=creatives");
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
    verifiedOnly,
    lookingForQuery: lookingForQ,
  });
  const peerFiltered =
    viewerRole === "venue"
      ? live.filter((p) => p.role !== "venue")
      : live;
  const profiles =
    groupFilter === "creatives"
      ? peerFiltered.filter((p) => p.role !== "venue")
      : groupFilter === "venues"
        ? peerFiltered.filter((p) => p.role === "venue")
        : peerFiltered;
  const recommendedProfiles = [...profiles]
    .filter((p) => typeof p.semanticScore === "number" && (p.semanticScore ?? 0) >= 0.72)
    .sort((a, b) => (b.semanticScore ?? 0) - (a.semanticScore ?? 0))
    .slice(0, 3);
  const effectiveGroupFilter =
    viewerRole === "venue" && groupFilter === "" ? "creatives" : groupFilter;

  const filterLinks =
    viewerRole === "venue"
      ? FILTERS.filter((f) => f.group === "creatives")
      : FILTERS;
  await trackServerEvent({
    event: "discover_opened",
    path: `/explore${effectiveGroupFilter ? `?group=${effectiveGroupFilter}` : ""}`,
    metadata: { groupFilter: effectiveGroupFilter || "all" },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Discover
        </h1>
        <p className="mt-3 mx-auto max-w-xl text-sm leading-relaxed text-zinc-500">
          {viewerId ? (
            <>
              Browse real prodLink members who finished building their profiles.
              {viewerRole === "venue"
                ? " You only browse creatives."
                : " Filter by creatives or venues."}{" "}
              <span className="text-zinc-400">Open a card → View full profile</span> for the public
              page.
            </>
          ) : (
            <>
              Add Supabase in{" "}
              <code className="text-zinc-400">.env.local</code>, then{" "}
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
        {notice ? (
          <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100">
            {notice}
          </p>
        ) : null}
        <div className="mt-8">
          <p
            id="discover-filters"
            className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500"
          >
            Show
          </p>
          <div
            className="flex flex-wrap items-center justify-center gap-2"
            role="group"
            aria-labelledby="discover-filters"
          >
            {filterLinks.map(({ group, label }) => {
              const href = group ? `/explore?group=${group}` : "/explore";
              const linkActive =
                group === ""
                  ? effectiveGroupFilter === ""
                  : effectiveGroupFilter === group;
              return (
                <Link
                  key={group || "all"}
                  href={href}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition sm:text-sm ${
                    linkActive
                      ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                      : "bg-white/5 text-zinc-400 ring-1 ring-white/10 hover:bg-white/10 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <DiscoverFilterBar
          key={`${groupFilter || "all"}-${sort}-${verifiedOnly ? "v" : "a"}-${lookingForQ}`}
          initialSort={sort}
          initialVerified={verifiedOnly}
          initialLookingFor={lookingForQ}
        />
        <DistanceFilter key={`${groupFilter || "all"}-${maxKm}`} initialKm={maxKm} />
      </div>

      {recommendedProfiles.length > 0 ? (
        <section className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Recommended for you</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Closest semantic matches based on your full profile.
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-500/30">
              AI
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recommendedProfiles.map((profile) => (
              <Link
                key={`recommended-${profile.id}`}
                href={`/p/${profile.id}`}
                className="rounded-xl border border-white/10 bg-zinc-950/40 p-4 transition hover:border-white/20 hover:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-100">{profile.displayName}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {profile.role} · {profile.city}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                    {Math.round((profile.semanticScore ?? 0) * 100)}%
                  </span>
                </div>
                {profile.matchWhy?.[0] ? (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                    {profile.matchWhy[0]}
                  </p>
                ) : null}
                {profile.aiTags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.aiTags.slice(0, 3).map((tag) => (
                      <span
                        key={`${profile.id}-${tag}`}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
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
