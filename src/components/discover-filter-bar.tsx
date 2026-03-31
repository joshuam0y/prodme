"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Sort = "nearby" | "trending" | "new";

export function DiscoverFilterBar({
  initialSort,
  initialVerified,
  initialLookingFor,
}: {
  initialSort: Sort;
  initialVerified: boolean;
  initialLookingFor: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sort, setSort] = useState<Sort>(initialSort);
  const [verified, setVerified] = useState(initialVerified);
  const [lookingFor, setLookingFor] = useState(initialLookingFor);

  const debounceRef = useRef<number | null>(null);

  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    // Preserve the existing discover params.
    const group = searchParams.get("group");
    const maxKm = searchParams.get("maxKm");
    const notice = searchParams.get("notice");
    if (group) p.set("group", group);
    if (maxKm) p.set("maxKm", maxKm);
    if (notice) p.set("notice", notice);
    return p;
  }, [searchParams]);

  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const p = new URLSearchParams(baseParams);
      if (sort) p.set("sort", sort);
      if (verified) p.set("verified", "1");
      if (lookingFor.trim()) p.set("q", lookingFor.trim());
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }, 240);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [baseParams, lookingFor, pathname, router, sort, verified]);

  return (
    <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-white/10 bg-zinc-900/40 p-3 text-left">
      <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
        <label className="block text-xs font-medium text-zinc-500">
          Sort
          <select
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200"
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
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="e.g. venue, vocalist, collab…"
          />
        </label>

        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
            className="h-4 w-4 accent-amber-500"
          />
          Verified only
        </label>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">
        Updates as you type.
      </p>
    </div>
  );
}

