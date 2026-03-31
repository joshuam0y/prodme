"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function DistanceFilter({ initialKm }: { initialKm: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [km, setKm] = useState(initialKm);
  const lastSentRef = useRef<number>(initialKm);
  const debounceRef = useRef<number | null>(null);

  const group = searchParams.get("group");
  const notice = searchParams.get("notice");

  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    if (group) p.set("group", group);
    if (notice) p.set("notice", notice);
    return p;
  }, [group, notice]);

  useEffect(() => {
    if (km === lastSentRef.current) return;
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      lastSentRef.current = km;
      const p = new URLSearchParams(baseParams);
      p.set("maxKm", String(km));
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }, 220);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [km, baseParams, pathname, router]);

  return (
    <div className="mx-auto mt-5 max-w-md rounded-xl border border-white/10 bg-zinc-900/40 p-3 text-left">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>Distance radius</span>
        <span className="tabular-nums">{km} km</span>
      </div>
      <input
        type="range"
        min={1}
        max={200}
        step={1}
        value={km}
        onChange={(e) => setKm(Number(e.target.value))}
        className="mt-2 w-full"
        aria-label="Distance radius"
      />
      <p className="mt-1 text-[11px] text-zinc-500">
        Updates instantly as you drag.
      </p>
    </div>
  );
}

