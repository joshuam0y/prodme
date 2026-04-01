"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Sort = "nearby" | "trending" | "new";
type DiscoverGroup = "" | "creatives" | "venues";

export function DiscoverFilterBar({
  initialGroup,
  initialSort,
  initialLookingFor,
  initialKm,
  allowVenueFilter,
}: {
  initialGroup: DiscoverGroup;
  initialSort: Sort;
  initialLookingFor: string;
  initialKm: number;
  allowVenueFilter: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [group, setGroup] = useState<DiscoverGroup>(initialGroup);
  const [sort, setSort] = useState<Sort>(initialSort);
  const [lookingFor, setLookingFor] = useState(initialLookingFor);
  const [km, setKm] = useState(initialKm);

  const debounceRef = useRef<number | null>(null);

  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    // Preserve the existing discover params.
    const notice = searchParams.get("notice");
    if (notice) p.set("notice", notice);
    return p;
  }, [searchParams]);

  const activeCount =
    (group ? 1 : 0) +
    (sort !== "trending" ? 1 : 0) +
    (lookingFor.trim() ? 1 : 0) +
    (km !== 50 ? 1 : 0);

  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const p = new URLSearchParams(baseParams);
      if (group) p.set("group", group);
      if (sort) p.set("sort", sort);
      p.set("maxKm", String(km));
      if (lookingFor.trim()) p.set("q", lookingFor.trim());
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }, 240);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [baseParams, group, km, lookingFor, pathname, router, sort]);

  return (
    <details className="mx-auto mt-6 max-w-3xl rounded-3xl border border-white/10 bg-zinc-900/45 text-left shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-sm text-zinc-200 [&::-webkit-details-marker]:hidden sm:px-5">
        <span className="inline-flex items-center gap-3">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-200">
            Filters
          </span>
          <span className="text-zinc-400">
            {activeCount > 0 ? `${activeCount} active` : "Discover controls"}
          </span>
        </span>
        <span className="text-xs uppercase tracking-[0.22em] text-zinc-500">Open</span>
      </summary>
      <div className="border-t border-white/10 px-4 py-4 sm:px-5">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/35 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Show
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { value: "" as DiscoverGroup, label: "All" },
                { value: "creatives" as DiscoverGroup, label: "Creatives" },
                ...(allowVenueFilter
                  ? [{ value: "venues" as DiscoverGroup, label: "Venues" }]
                  : []),
              ].map((option) => (
                <button
                  key={option.value || "all"}
                  type="button"
                  onClick={() => setGroup(option.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition sm:text-sm ${
                    group === option.value
                      ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                      : "bg-white/5 text-zinc-400 ring-1 ring-white/10 hover:bg-white/10 hover:text-zinc-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/35 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              <span>Radius</span>
              <span className="tabular-nums text-zinc-300">{km} km</span>
            </div>
            <input
              type="range"
              min={1}
              max={200}
              step={1}
              value={km}
              onChange={(e) => setKm(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--accent)]"
              aria-label="Distance radius"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-500">
            Sort
            <select
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-200"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              <option value="nearby">Nearby</option>
              <option value="trending">Trending</option>
              <option value="new">New</option>
            </select>
          </label>

          <label className="block text-xs font-medium text-zinc-500">
            Looking for
            <input
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600"
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              placeholder="e.g. engineer, venue, vocalist, collab"
            />
          </label>
        </div>
      </div>
    </details>
  );
}
