import Link from "next/link";
import { redirect } from "next/navigation";
import { SwipeStack } from "@/components/swipe-stack";
import { mockProfiles } from "@/data/mock";
import { getLiveProfileCards, inferProfileRole } from "@/lib/discover-profiles";
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
  searchParams: Promise<{ group?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const groupFilter = isGroup(params.group) ? params.group : "";
  const notice = params.notice ? decodeURIComponent(params.notice) : null;

  let viewerId: string | null = null;
  let viewerRole: Role | null = null;
  let teaserCount = mockProfiles.length;
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
    if (viewerId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", viewerId)
        .maybeSingle();
      if (prof?.role?.trim()) {
        viewerRole = inferProfileRole(prof.role);
      }
    }
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("onboarding_completed_at", "is", null);
    teaserCount = Math.max(mockProfiles.length, count ?? 0);
  }

  // Venues can only see creatives. If they request "Venues" filter, send them back.
  if (viewerRole === "venue" && groupFilter === "venues") {
    redirect("/explore?group=creatives");
  }

  const live = await getLiveProfileCards(viewerId, viewerId);
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

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Discover
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          {viewerId ? (
            <>
              Real completed profiles appear first; sample cards fill the rest.
              {viewerRole === "venue"
                ? "As a venue, you only see creatives (producers, artists, and DJs)."
                : "Producers/creatives can browse creatives together; switch to 'Venues' to see venue profiles."}{" "}
              Open
              <span className="text-zinc-400"> View full profile </span>
              on real members to see their public page.
            </>
          ) : (
            <>
              Swipe sample cards and real completed profiles first.{" "}
              <Link
                href="/signup?next=/explore"
                className="text-amber-400/95 underline-offset-2 hover:underline"
              >
                Create an account
              </Link>{" "}
              or{" "}
              <Link
                href="/login?next=/explore"
                className="text-amber-400/95 underline-offset-2 hover:underline"
              >
                sign in
              </Link>{" "}
              to save stars and interested lists. About {teaserCount} profiles in
              the community. Open
              <span className="text-zinc-400"> View full profile </span> on
              members to see their public page.
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
            Filter
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
      </div>

      <SwipeStack
        key={`${groupFilter || "all"}-${viewerRole ?? "?"}`}
        profiles={profiles}
      />
    </main>
  );
}
