import Link from "next/link";
import { redirect } from "next/navigation";
import { SwipeStack } from "@/components/swipe-stack";
import { DistanceFilter } from "@/components/distance-filter";
import { mockProfiles } from "@/data/mock";
import { getLiveProfileCards, inferProfileRole } from "@/lib/discover-profiles";
import { trackServerEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
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
  searchParams: Promise<{ group?: string; notice?: string; maxKm?: string }>;
}) {
  const params = await searchParams;
  const groupFilter = isGroup(params.group) ? params.group : "";
  const notice = params.notice ? decodeURIComponent(params.notice) : null;
  const maxKm = Math.max(1, Math.min(200, Number(params.maxKm ?? 50) || 50));

  let viewerId: string | null = null;
  let viewerRole: Role | null = null;
  let viewerLat: number | null = null;
  let viewerLng: number | null = null;
  let needsOnboarding = false;
  let communityCount = mockProfiles.length;
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
      .select("role, onboarding_completed_at, latitude, longitude")
      .eq("id", viewerId)
      .maybeSingle();
    if (prof?.role?.trim()) {
      viewerRole = inferProfileRole(prof.role);
    }
    needsOnboarding = !prof?.onboarding_completed_at;
    viewerLat = prof?.latitude ?? null;
    viewerLng = prof?.longitude ?? null;
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("onboarding_completed_at", "is", null);
    communityCount = count ?? 0;
  }

  // Venues can only see creatives. If they request "Venues" filter, send them back.
  if (viewerRole === "venue" && groupFilter === "venues") {
    redirect("/explore?group=creatives");
  }

  const live = await getLiveProfileCards(viewerId, viewerId, {
    viewerLat,
    viewerLng,
    maxDistanceKm: maxKm,
  });
  const pool = [...live, ...mockProfiles];
  const peerFiltered =
    viewerRole === "venue"
      ? pool.filter((p) => p.role !== "venue")
      : pool;
  const profiles =
    groupFilter === "creatives"
      ? peerFiltered.filter((p) => p.role !== "venue")
      : groupFilter === "venues"
        ? peerFiltered.filter((p) => p.role === "venue")
        : peerFiltered;

  const filterLinks = FILTERS.filter(
    (f) => !(viewerRole === "venue" && f.group === "venues"),
  );
  await trackServerEvent({
    event: "discover_opened",
    path: `/explore${groupFilter ? `?group=${groupFilter}` : ""}`,
    metadata: { groupFilter: groupFilter || "all" },
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
              Completed profiles rank first; sample cards keep the deck full.
              {viewerRole === "venue"
                ? " You only browse creatives."
                : " Filter by creatives or venues."}{" "}
              <span className="text-zinc-400">Open a card → View full profile</span> for the public
              page.
            </>
          ) : (
            <>
              Demo stack ({communityCount} sample profiles). Add Supabase in{" "}
              <code className="text-zinc-400">.env.local</code>, then{" "}
              <Link
                href="/signup?next=/explore"
                className="text-amber-400/95 underline-offset-2 hover:underline"
              >
                sign up
              </Link>{" "}
              for real Discover, Likes, and Messages.
            </>
          )}
        </p>
        {notice ? (
          <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100">
            {notice}
          </p>
        ) : null}
        {viewerId && needsOnboarding ? (
          <div className="mx-auto mt-4 max-w-xl rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-left">
            <p className="text-sm font-medium text-amber-100">Finish your profile to improve match quality.</p>
            <p className="mt-1 text-xs text-amber-200/90">
              Completed profiles rank higher and unlock better recommendations.
            </p>
            <Link
              href="/onboarding"
              className="mt-2 inline-flex rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              Complete onboarding
            </Link>
          </div>
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
                group === "" ? groupFilter === "" : groupFilter === group;
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
        <DistanceFilter key={`${groupFilter || "all"}-${maxKm}`} initialKm={maxKm} />
      </div>

      <SwipeStack
        key={`${groupFilter || "all"}-${viewerRole ?? "?"}`}
        profiles={profiles}
        viewerId={viewerId}
      />
    </main>
  );
}
