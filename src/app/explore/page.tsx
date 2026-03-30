import Link from "next/link";
import { redirect } from "next/navigation";
import { SwipeStack } from "@/components/swipe-stack";
import { mockProfiles } from "@/data/mock";
import { getLiveProfileCards, inferProfileRole } from "@/lib/discover-profiles";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Role } from "@/lib/types";

const FILTERS: { param: string; label: string; role?: Role }[] = [
  { param: "", label: "All" },
  { param: "producer", label: "Producers", role: "producer" },
  { param: "artist", label: "Artists", role: "artist" },
  { param: "dj", label: "DJs", role: "dj" },
  { param: "venue", label: "Venues", role: "venue" },
];

function isRole(s: string | undefined): s is Role {
  return (
    s === "producer" || s === "artist" || s === "dj" || s === "venue"
  );
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const roleFilter = isRole(params.role) ? params.role : undefined;
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

  if (!viewerId) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 text-center shadow-xl sm:p-10">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Discover is members-only
          </h1>
          <p className="mt-3 text-sm text-zinc-500 sm:text-base">
            Create an account to unlock profiles, preview tracks, and save people you
            want to work with.
          </p>
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Community preview
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              {teaserCount}+ members currently on Discover
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400 blur-[1px]">
                Producer
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400 blur-[1px]">
                Artist
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400 blur-[1px]">
                DJ
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400 blur-[1px]">
                Venue
              </span>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup?next=/explore"
              className="inline-flex w-full justify-center rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 sm:w-auto"
            >
              Create account
            </Link>
            <Link
              href="/login?next=/explore"
              className="inline-flex w-full justify-center rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 sm:w-auto"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (viewerRole && roleFilter && roleFilter === viewerRole) {
    redirect("/explore");
  }

  const live = await getLiveProfileCards(viewerId, viewerId);
  const pool = [...live, ...mockProfiles];
  const withoutSameRole = viewerRole
    ? pool.filter((p) => p.role !== viewerRole)
    : pool;
  const profiles = roleFilter
    ? withoutSameRole.filter((p) => p.role === roleFilter)
    : withoutSameRole;

  const filterLinks = FILTERS.filter(
    (f) => !f.role || !viewerRole || f.role !== viewerRole,
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Discover
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          Real completed profiles appear first; sample cards fill the rest. You
          won&apos;t see people with the same role as you (so venues don&apos;t
          see venues, producers don&apos;t see producers, etc.). Open
          <span className="text-zinc-400"> View full profile </span>
          on real members to see their public page.
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
            {filterLinks.map(({ param, label, role }) => {
              const href = param ? `/explore?role=${param}` : "/explore";
              const linkActive =
                param === "" ? roleFilter === undefined : roleFilter === role;
              return (
                <Link
                  key={param || "all"}
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
        key={`${roleFilter ?? "all"}-${viewerRole ?? "?"}`}
        profiles={profiles}
      />
    </main>
  );
}
