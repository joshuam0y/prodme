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
      : "trending";

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

  await trackServerEvent({
    event: "discover_opened",
    path: `/explore${effectiveGroupFilter ? `?group=${effectiveGroupFilter}` : ""}`,
    metadata: { groupFilter: effectiveGroupFilter || "all" },
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Discover
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
          {viewerId ? (
            <>
              Swipe through active prodLink profiles, open any card for the full profile, and keep the momentum going.
              {viewerRole === "venue" ? " Your feed stays focused on creatives." : null}
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
        <DiscoverFilterBar
          key={`${groupFilter || "all"}-${sort}-${maxKm}`}
          initialGroup={effectiveGroupFilter}
          initialSort={sort}
          initialKm={maxKm}
          allowVenueFilter={viewerRole !== "venue"}
        />
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
                      {roleLabel(profile.role)} · {profile.city}
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
