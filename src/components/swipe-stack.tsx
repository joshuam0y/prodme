"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BeatPreview, ProfileCard } from "@/lib/types";
import { isUuid } from "@/lib/uuid";

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
const MAX_EXTRA = 5;

type PlayingMeta = { id: string; title: string; coverUrl: string };

export function SwipeStack({ profiles }: Props) {
  const [index, setIndex] = useState(0);
  const [exitDir, setExitDir] = useState<"left" | "right" | "up" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const pointerDown = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const [playingMeta, setPlayingMeta] = useState<PlayingMeta | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gestureStarted = useRef(false);

  const current = profiles[index];
  const done = index >= profiles.length;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    if (!current?.starBeat) {
      setPlayingMeta(null);
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.removeAttribute("src");
        a.load();
      }
      return;
    }

    setPlayingMeta({
      id: current.starBeat.id,
      title: current.starBeat.title,
      coverUrl: current.starBeat.coverUrl,
    });
    const a = audioRef.current;
    if (!a) return;
    a.src = current.starBeat.audioUrl;
    a.load();
    const tryPlay = () => {
      void a.play().catch(() => {
        /* autoplay blocked until gesture */
      });
    };
    if (gestureStarted.current) tryPlay();
  }, [index, current?.id, current?.starBeat]);

  const playBeat = useCallback((beat: BeatPreview) => {
    gestureStarted.current = true;
    const a = audioRef.current;
    if (!a) return;
    setPlayingMeta({
      id: beat.id,
      title: beat.title,
      coverUrl: beat.coverUrl,
    });
    a.src = beat.audioUrl;
    void a.play().catch(() => {});
  }, []);

  const toggleMainPlay = useCallback(() => {
    const a = audioRef.current;
    if (!a?.src) return;
    gestureStarted.current = true;
    if (a.paused) void a.play().catch(() => {});
    else a.pause();
  }, []);

  const advance = useCallback(
    (dir: "left" | "right" | "up") => {
      if (!current || done) return;
      const a = audioRef.current;
      if (a) {
        a.pause();
      }
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
    gestureStarted.current = true;
    const a = audioRef.current;
    if (
      a &&
      current?.starBeat &&
      playingMeta?.id === current.starBeat.id &&
      a.paused
    ) {
      void a.play().catch(() => {});
    }
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

  const star = current.starBeat;
  const extras = (current.extraBeats ?? []).slice(0, MAX_EXTRA);
  const heroCover = playingMeta?.coverUrl ?? star?.coverUrl;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <audio
        ref={audioRef}
        className="hidden"
        preload="auto"
        onPlay={() => setAudioReady(true)}
        onPause={() => setAudioReady(false)}
        onEnded={() => setAudioReady(false)}
      />

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
        className={`relative min-h-[480px] touch-none overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 shadow-2xl select-none ${
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
          className={`h-28 bg-gradient-to-br ${current.accent} opacity-90`}
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

          {star && heroCover ? (
            <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.04] p-4">
              <div className="flex items-start gap-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/10">
                  <Image
                    src={heroCover}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/90">
                    Star track
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-zinc-100">
                    {playingMeta?.title ?? star.title}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Plays when you open this card — swipe for the next sound.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (playingMeta?.id !== star.id) {
                        playBeat(star);
                      } else {
                        toggleMainPlay();
                      }
                    }}
                    className="mt-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-500/35 transition hover:bg-amber-500/30"
                  >
                    {audioReady && playingMeta?.id === star.id
                      ? "Pause"
                      : "Play star"}
                  </button>
                </div>
              </div>

              {extras.length > 0 ? (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    More beats
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {extras.map((beat) => {
                      const active = playingMeta?.id === beat.id;
                      return (
                        <li key={beat.id} className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playBeat(beat);
                            }}
                            className={`group relative h-14 w-14 overflow-hidden rounded-lg ring-1 transition ${
                              active
                                ? "ring-amber-400/80"
                                : "ring-white/10 hover:ring-amber-500/50"
                            }`}
                            aria-label={`Play ${beat.title}`}
                          >
                            <Image
                              src={beat.coverUrl}
                              alt=""
                              width={56}
                              height={56}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                            <span
                              className={`absolute inset-0 flex items-center justify-center bg-black/45 text-lg text-white transition ${
                                active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              }`}
                              aria-hidden
                            >
                              ▶
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Best work
              </p>
              <p className="mt-1 text-sm text-zinc-200">{current.highlight}</p>
            </div>
          )}
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
        {isUuid(current.id) ? (
          <Link
            href={`/p/${current.id}`}
            className="block text-center text-sm font-medium text-amber-500/90 transition hover:text-amber-400"
          >
            View full profile
          </Link>
        ) : null}
        <p className="text-center text-xs text-zinc-600">
          Drag card left / right / up — or use the buttons
        </p>
      </div>
    </div>
  );
}
