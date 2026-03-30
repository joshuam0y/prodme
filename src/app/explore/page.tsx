import Link from "next/link";
import { SwipeStack } from "@/components/swipe-stack";
import { mockProfiles } from "@/data/mock";
import { getLiveProfileCards } from "@/lib/discover-profiles";
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
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const roleFilter = isRole(params.role) ? params.role : undefined;

  let viewerId: string | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    viewerId = user?.id ?? null;
  }

  const live = await getLiveProfileCards(viewerId);
  const pool = [...live, ...mockProfiles];
  const profiles = roleFilter
    ? pool.filter((p) => p.role === roleFilter)
    : pool;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Discover
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Real completed profiles appear first; sample cards fill the rest. Open
          <span className="text-zinc-400"> View full profile </span>
          on real members to see their public page.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        {FILTERS.map(({ param, label, role }) => {
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

      <SwipeStack profiles={profiles} />
    </main>
  );
}
