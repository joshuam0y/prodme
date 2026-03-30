"use client";

import { useCallback, useRef, useState } from "react";
import type { ProfileCard } from "@/lib/types";

type Props = {
  profiles: ProfileCard[];
};

const roleLabel: Record<ProfileCard["role"], string> = {
  producer: "Producer",
  artist: "Artist",
  dj: "DJ",
  venue: "Venue",
};

const THRESHOLD_PX = 72;

export function SwipeStack({ profiles }: Props) {
  const [index, setIndex] = useState(0);
  const [exitDir, setExitDir] = useState<"left" | "right" | "up" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const pointerDown = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  const current = profiles[index];
  const done = index >= profiles.length;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const advance = useCallback(
    (dir: "left" | "right" | "up") => {
      if (!current || done) return;
      setDrag({ x: 0, y: 0 });
      setExitDir(dir);
      if (dir === "up") {
        showToast("We’ll connect you when messaging ships.");
      }
      window.setTimeout(() => {
        setExitDir(null);
        setIndex((i) => i + 1);
      }, 220);
    },
    [current, done, showToast],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (exitDir || done) return;
    pointerDown.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    setDrag({ x: 0, y: 0 });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDown.current || exitDir) return;
    setDrag({
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
    });
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDown.current) return;
    pointerDown.current = false;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    if (exitDir || done) return;

    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    const horizontal = Math.abs(dx) > THRESHOLD_PX && Math.abs(dx) > Math.abs(dy) * 0.85;
    const upward = dy < -THRESHOLD_PX && Math.abs(dy) > Math.abs(dx) * 0.85;

    if (horizontal) {
      advance(dx < 0 ? "left" : "right");
      return;
    }
    if (upward) {
      advance("up");
      return;
    }

    setDrag({ x: 0, y: 0 });
  };

  if (profiles.length === 0) {
    return (
      <p className="text-center text-zinc-500">No profiles to show yet.</p>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-16 text-center">
        <p className="text-lg font-medium text-zinc-200">
          You&apos;re caught up for now.
        </p>
        <p className="max-w-sm text-sm text-zinc-500">
          More creators and venues will land here as prod.me grows. Refresh
          later or tweak your preferences (coming soon).
        </p>
        <button
          type="button"
          onClick={() => setIndex(0)}
          className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-90"
        >
          Start over
        </button>
      </div>
    );
  }

  const dragTransform =
    exitDir || !dragging
      ? undefined
      : {
          transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x * 0.05}deg)`,
        };

  return (
    <div className="relative mx-auto w-full max-w-md">
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-[60] flex justify-center px-4">
          <p className="rounded-full border border-white/15 bg-zinc-900/95 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
            {toast}
          </p>
        </div>
      )}

      <div
        role="group"
        aria-label="Profile card — drag to pass, save, or show interest"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={dragTransform}
        className={`relative min-h-[420px] touch-none overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 shadow-2xl select-none ${
          dragging && !exitDir ? "cursor-grabbing" : "cursor-grab"
        } ${
          dragging && !exitDir ? "transition-none" : "transition-transform duration-200 ease-out"
        } ${
          exitDir === "left"
            ? "-translate-x-[120%] -rotate-6 opacity-0"
            : exitDir === "right"
              ? "translate-x-[120%] rotate-6 opacity-0"
              : exitDir === "up"
                ? "-translate-y-[140%] opacity-0"
                : ""
        }`}
      >
        <div
          className={`h-36 bg-gradient-to-br ${current.accent} opacity-90`}
          aria-hidden
        />
        <div className="space-y-4 px-6 pb-8 pt-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
                {current.displayName}
              </h2>
              <p className="text-sm text-zinc-400">
                {roleLabel[current.role]} · {current.city}
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
              {current.niche}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-zinc-300">{current.bio}</p>
          <div className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Best work
            </p>
            <p className="mt-1 text-sm text-zinc-200">{current.highlight}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => advance("left")}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-zinc-800/80 text-zinc-300 transition hover:bg-zinc-700"
            aria-label="Pass"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={() => advance("right")}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-zinc-800/80 text-zinc-300 transition hover:bg-zinc-700"
            aria-label="Save for later"
          >
            ★
          </button>
        </div>
        <button
          type="button"
          onClick={() => advance("up")}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-4 text-sm font-semibold text-zinc-950 shadow-lg shadow-orange-500/20 transition hover:opacity-95"
        >
          Interested — buy or work together
        </button>
        <p className="text-center text-xs text-zinc-600">
          Drag card left / right / up — or use the buttons
        </p>
      </div>
    </div>
  );
}
