"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Sort = "nearby" | "trending" | "new";
type DiscoverGroup = "" | "creatives" | "venues";

export function DiscoverFilterBar({
  initialGroup,
  initialSort,
  initialKm,
  allowVenueFilter,
}: {
  initialGroup: DiscoverGroup;
  initialSort: Sort;
  initialKm: number;
  allowVenueFilter: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [group, setGroup] = useState<DiscoverGroup>(initialGroup);
  const [sort, setSort] = useState<Sort>(initialSort);
  const [km, setKm] = useState(initialKm);
  const [open, setOpen] = useState(false);

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
    (sort !== "new" ? 1 : 0) +
    (km !== 50 ? 1 : 0);

  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const p = new URLSearchParams(baseParams);
      if (group) p.set("group", group);
      if (sort) p.set("sort", sort);
      p.set("maxKm", String(km));
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }, 240);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [baseParams, group, km, pathname, router, sort]);

  return (
    <section className="mx-auto mt-6 max-w-3xl rounded-3xl border border-zinc-300/80 bg-white/90 text-left shadow-[0_16px_48px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-900/45 dark:shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-sm text-zinc-800 dark:text-zinc-200 sm:px-5"
      >
        <span className="inline-flex items-center gap-3">
          <span className="rounded-full border border-amber-600/25 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            Filters
          </span>
          <span className="text-zinc-600 dark:text-zinc-400">
            {activeCount > 0 ? `${activeCount} active` : "Discover controls"}
          </span>
        </span>
        <span className="text-xs uppercase tracking-[0.22em] text-zinc-600 dark:text-zinc-500">
          {open ? "Close" : "Open"}
        </span>
      </button>
      {open ? (
      <div className="border-t border-zinc-200/90 dark:border-white/10 px-4 py-4 sm:px-5">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/90 p-4 dark:border-white/10 dark:bg-zinc-950/35">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-500">
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
                      ? "bg-amber-500/25 text-amber-950 ring-1 ring-amber-600/40 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-500/40"
                      : "bg-zinc-200/80 text-zinc-700 ring-1 ring-zinc-300/80 hover:bg-zinc-300/80 hover:text-zinc-900 dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/90 p-4 dark:border-white/10 dark:bg-zinc-950/35">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-500">
              <span>Radius</span>
              <span className="tabular-nums text-zinc-800 dark:text-zinc-300">{km} km</span>
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

        <div className="mt-4">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-500">
            Sort
            <select
              className="mt-1.5 w-full rounded-2xl border border-zinc-300/80 bg-white px-3 py-2.5 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-200"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              <option value="nearby">Nearby</option>
              <option value="trending">Trending</option>
              <option value="new">New</option>
            </select>
          </label>
        </div>
      </div>
      ) : null}
    </section>
  );
}
