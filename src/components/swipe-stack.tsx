"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  recordDiscoverAction,
  removeDiscoverAction,
  resetDiscoverSwipes,
} from "@/app/explore/actions";
import type { BeatPreview, ProfileCard } from "@/lib/types";
import { isUuid } from "@/lib/uuid";

type Props = {
  profiles: ProfileCard[];
  viewerId?: string | null;
};

const roleLabel: Record<ProfileCard["role"], string> = {
  producer: "Producer",
  artist: "Artist",
  dj: "DJ",
  venue: "Venue",
};

const THRESHOLD_PX = 72;
const MAX_EXTRA = 5;

function loadDismissedIds(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function persistDismissedIds(key: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify([...ids]));
}

function isInteractivePointerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button, a[href], [role='button']"));
}

type PlayingMeta = { id: string; title: string; coverUrl: string };
type SwipeDir = "left" | "right" | "up";

export function SwipeStack({ profiles, viewerId }: Props) {
  const signedIn = Boolean(viewerId && viewerId.trim());
  const router = useRouter();

  const dismissedKey = signedIn && viewerId ? `prodme.discover.dismissedIds:${viewerId}` : "prodme.discover.dismissedIds:anon";

  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [exitDir, setExitDir] = useState<"left" | "right" | "up" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lastSwipe, setLastSwipe] = useState<{ id: string; dir: SwipeDir } | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const pointerDown = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const [playingMeta, setPlayingMeta] = useState<PlayingMeta | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gestureStarted = useRef(false);

  useEffect(() => {
    setDismissed(loadDismissedIds(dismissedKey));
  }, [dismissedKey]);

  const visibleProfiles = useMemo(
    () => profiles.filter((p) => !dismissed.has(p.id)),
    [profiles, dismissed],
  );

  const current = visibleProfiles[0];
  const done = profiles.length > 0 && !current;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const lightboxPhotos = useMemo(() => {
    if (!current) return [] as string[];
    const photos: string[] = [];
    const star = current.starBeat;
    const venueLike = current.role === "venue";
    const photoOnlyStar = Boolean(star?.coverUrl) && (!star?.audioUrl || venueLike);
    if (photoOnlyStar && star?.coverUrl) photos.push(star.coverUrl);
    for (const beat of current.extraBeats ?? []) {
      if (!beat.coverUrl) continue;
      if (venueLike || !beat.audioUrl) photos.push(beat.coverUrl);
    }
    return [...new Set(photos)];
  }, [current]);

  const lightboxUrl =
    lightboxIndex !== null ? (lightboxPhotos[lightboxIndex] ?? null) : null;

  const openLightbox = useCallback(
    (url: string) => {
      const idx = lightboxPhotos.indexOf(url);
      setLightboxIndex(idx >= 0 ? idx : 0);
    },
    [lightboxPhotos],
  );

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (!lightboxPhotos.length) return;
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev === null ? 0 : (prev + 1) % lightboxPhotos.length,
        );
      }
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev === null
            ? lightboxPhotos.length - 1
            : (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length,
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxUrl, lightboxPhotos.length]);

  useEffect(() => {
    const next = visibleProfiles[1];
    if (!next) return;
    const preloadUrl =
      next.starBeat?.coverUrl ??
      next.extraBeats?.find((b) => Boolean(b.coverUrl))?.coverUrl;
    if (!preloadUrl) return;
    const img = new window.Image();
    img.src = preloadUrl;
  }, [visibleProfiles]);

  useEffect(() => {
    const isVenueProfile = current?.role === "venue";
    const star = current?.starBeat;
    const a = audioRef.current;

    // Venues are photo-first: no autoplay / no track playback.
    if (!a || !star || isVenueProfile || !star.audioUrl) {
      setPlayingMeta(null);
      if (a) {
        a.pause();
        a.removeAttribute("src");
        a.load();
      }
      return;
    }

    setPlayingMeta({
      id: star.id,
      title: star.title,
      coverUrl: star.coverUrl,
    });

    a.src = star.audioUrl;
    a.load();
    const tryPlay = () => {
      void a.play().catch(() => {
        /* autoplay blocked until gesture */
      });
    };
    if (gestureStarted.current) tryPlay();
  }, [current?.id, current?.starBeat, current?.role]);

  const playBeat = useCallback((beat: BeatPreview) => {
    if (current?.role === "venue") return;
    if (!beat.audioUrl) return;
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
  }, [current?.role]);

  const toggleMainPlay = useCallback(() => {
    if (current?.role === "venue") return;
    const a = audioRef.current;
    if (!a?.src) return;
    gestureStarted.current = true;
    if (a.paused) void a.play().catch(() => {});
    else a.pause();
  }, [current?.role]);

  const toggleBeatOrPlay = useCallback(
    (beat: BeatPreview) => {
      if (playingMeta?.id === beat.id) {
        toggleMainPlay();
      } else {
        playBeat(beat);
      }
    },
    [playingMeta?.id, playBeat, toggleMainPlay],
  );

  const advance = useCallback(
    (dir: SwipeDir) => {
      const top = visibleProfiles[0];
      if (!top) return;
      const action =
        dir === "left" ? "pass" : dir === "right" ? "save" : "interested";
      if (isUuid(top.id)) {
        // Fire-and-forget, but swallow errors to avoid unhandled promise rejections.
        void recordDiscoverAction(top.id, action).catch(() => {});
      }
      const a = audioRef.current;
      if (a) {
        a.pause();
      }
      const dismissedId = top.id;
      setLastSwipe({ id: dismissedId, dir });
      setDrag({ x: 0, y: 0 });
      setExitDir(dir);
      if (dir === "up") {
        showToast("Added to Interested.");
      }
      window.setTimeout(() => {
        // Allow the next card to render normally after the exit animation.
        // (Previously this was only done for `!signedIn`, causing the next
        // card to remain `opacity-0`/translated for signed-in users.)
        setExitDir(null);
        if (!signedIn) {
          setDismissed((prev) => {
            const next = new Set(prev);
            next.add(dismissedId);
            persistDismissedIds(dismissedKey, next);
            return next;
          });
        } else {
          // Optimistic UI: hide the swiped card immediately (in-memory only),
          // then reconcile globally via server refresh.
          setDismissed((prev) => {
            const next = new Set(prev);
            next.add(dismissedId);
            // Real profiles are removed by server refresh via `discover_swipes`.
            // Mock cards are not, so we persist only non-UUID IDs locally.
            if (!isUuid(dismissedId)) persistDismissedIds(dismissedKey, next);
            return next;
          });
          router.refresh();
        }
      }, 220);
    },
    [visibleProfiles, showToast, signedIn, dismissedKey, router],
  );

  const undoLastSwipe = useCallback(() => {
    if (!lastSwipe) return;
    const { id } = lastSwipe;
    setExitDir(null);
    setDrag({ x: 0, y: 0 });
    setDismissed((prev) => {
      const next = new Set(prev);
      next.delete(id);
      persistDismissedIds(dismissedKey, next);
      return next;
    });
    if (signedIn && isUuid(id)) {
      const path =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/explore";
      void removeDiscoverAction(id, path)
        .then(() => router.refresh())
        .catch(() => {});
    }
    setLastSwipe(null);
  }, [lastSwipe, dismissedKey, signedIn, router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const typing =
        active instanceof HTMLElement &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable);
      if (typing || lightboxUrl) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        advance("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        advance("right");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        advance("up");
      } else if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        undoLastSwipe();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, undoLastSwipe, lightboxUrl]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isInteractivePointerTarget(e.target)) return;

    gestureStarted.current = true;
    const a = audioRef.current;
    if (
      current?.role !== "venue" &&
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
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
        <p className="text-lg font-medium text-zinc-200">
          No profiles to show yet.
        </p>
        <p className="max-w-sm text-sm text-zinc-500">
          You may have already swiped everything that matches your filters.
        </p>
        <button
          type="button"
          onClick={() => {
            setDismissed(new Set());
            persistDismissedIds(dismissedKey, new Set());
            if (signedIn) {
              const path =
                typeof window !== "undefined"
                  ? window.location.pathname + window.location.search
                  : "/explore";
              void resetDiscoverSwipes(path).then(() => router.refresh());
            }
          }}
          className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-90"
        >
          Start over
        </button>
      </div>
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
          onClick={() => {
            if (signedIn) {
              setDismissed(new Set());
              persistDismissedIds(dismissedKey, new Set());
              const path =
                typeof window !== "undefined"
                  ? window.location.pathname + window.location.search
                  : "/explore";
              void resetDiscoverSwipes(path).then(() => router.refresh());
              return;
            }

            setDismissed(new Set());
            persistDismissedIds(dismissedKey, new Set());
          }}
          className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-40"
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
  const isVenueProfile = current.role === "venue";
  const nextProfile = visibleProfiles[1];
  const isPhotoOnlyStar = !isVenueProfile && Boolean(star) && !star?.audioUrl;
  const heroCover = playingMeta?.coverUrl ?? star?.coverUrl;
  const playingStar = Boolean(star && playingMeta?.id === star.id);
  const showHint = dragging && !exitDir;
  const absX = Math.abs(drag.x);
  const absY = Math.abs(drag.y);
  const horizontalIntent = absX > absY * 0.85;
  const verticalIntent = drag.y < 0 && absY > absX * 0.85;
  const hintAction =
    showHint && horizontalIntent && absX > 18
      ? drag.x < 0
        ? "Pass"
        : "Save"
      : showHint && verticalIntent && absY > 18
        ? "Interested"
        : null;

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
        <div className="pointer-events-none fixed inset-x-0 top-20 sm:top-24 z-[60] flex justify-center px-4">
          <p className="rounded-full border border-white/15 bg-zinc-900/95 px-4 py-2 text-xs sm:text-sm text-zinc-100 shadow-lg backdrop-blur">
            {toast}
          </p>
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="relative w-full max-w-xl">
            {lightboxPhotos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) =>
                      prev === null
                        ? lightboxPhotos.length - 1
                        : (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length,
                    );
                  }}
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-zinc-900/80 px-3 py-2 text-lg text-zinc-100 hover:bg-zinc-900"
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) =>
                      prev === null ? 0 : (prev + 1) % lightboxPhotos.length,
                    );
                  }}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-zinc-900/80 px-3 py-2 text-lg text-zinc-100 hover:bg-zinc-900"
                  aria-label="Next photo"
                >
                  ›
                </button>
              </>
            ) : null}
            <Image
              src={lightboxUrl}
              alt=""
              width={1200}
              height={1200}
              className="max-h-[80vh] w-full rounded-2xl object-contain"
              unoptimized={lightboxUrl.includes("picsum.photos")}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(null);
              }}
              className="absolute -top-2 -right-2 rounded-full border border-white/20 bg-zinc-900/80 px-3 py-1 text-sm text-zinc-100 shadow hover:bg-zinc-900"
              aria-label="Close photo preview"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {nextProfile ? (
        <div className="pointer-events-none absolute inset-x-3 top-2 z-0 h-full rounded-2xl border border-white/10 bg-zinc-800/30 opacity-70">
          <div className={`h-20 rounded-t-2xl bg-gradient-to-br ${nextProfile.accent} opacity-60`} />
          <div className="px-4 py-3">
            <p className="truncate text-sm font-medium text-zinc-300">{nextProfile.displayName}</p>
            <p className="mt-1 text-xs text-zinc-500">{roleLabel[nextProfile.role]}</p>
          </div>
        </div>
      ) : null}

      <div
        role="group"
        aria-label="Profile card — drag to pass, save, or show interest"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={dragTransform}
        className={`relative z-10 min-h-[420px] sm:min-h-[480px] touch-none overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 shadow-2xl select-none ${
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
        {hintAction ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
            <span className="rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-100">
              {hintAction}
            </span>
          </div>
        ) : null}
        <div
          className={`h-28 bg-gradient-to-br ${current.accent} opacity-90`}
          aria-hidden
        />
        <div className="space-y-3 px-4 pb-6 pt-1 sm:px-6 sm:pb-8 sm:pt-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-50">
                {current.displayName}
              </h2>
              <p className="text-sm text-zinc-400">
                {roleLabel[current.role]} · {current.city}
              </p>
              {current.rankReason ? (
                <p className="mt-1 inline-flex rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-200">
                  {current.rankReason}
                </p>
              ) : null}
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] sm:text-xs text-zinc-300">
              {current.niche}
            </span>
          </div>
          {star ? (
            <p className="text-sm leading-relaxed text-zinc-300">{current.bio}</p>
          ) : null}

          {star && heroCover ? (
            <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.04] p-3 sm:p-4">
              <div className="flex items-start gap-3">
                {isVenueProfile || isPhotoOnlyStar ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLightbox(heroCover);
                    }}
                    className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/10 hover:ring-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    aria-label="Open featured photo"
                  >
                    <Image
                      src={heroCover}
                      alt=""
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </button>
                ) : (
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/10">
                    <Image
                      src={heroCover}
                      alt=""
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-widest ${
                      playingStar ? "text-amber-500/90" : "text-zinc-400"
                    }`}
                  >
                    {isVenueProfile
                      ? "Photo"
                      : isPhotoOnlyStar
                        ? "Featured photo"
                      : playingStar
                        ? "Star track"
                        : "Now playing"}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-zinc-100">
                    {isVenueProfile ? star.title : playingMeta?.title ?? star.title}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {isVenueProfile
                      ? "Photo highlights — swipe for the next person."
                      : isPhotoOnlyStar
                        ? "Photo highlight — swipe for the next person."
                      : playingStar
                        ? "Plays when you open this card — swipe for the next sound."
                        : "Extra preview on this profile — swipe for the next person."}
                  </p>
                  {isVenueProfile || isPhotoOnlyStar ? (
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-amber-300/85">
                      Tap photo to expand
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {isVenueProfile || isPhotoOnlyStar ? null : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMainPlay();
                          }}
                          className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-500/35 transition hover:bg-amber-500/30"
                        >
                          {audioReady ? "Pause" : "Play"}
                        </button>
                        {star && !playingStar ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playBeat(star);
                            }}
                            className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
                          >
                            Play star track
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {extras.length > 0 ? (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    {isVenueProfile ? "More photos" : "More beats"}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {extras.map((beat) => {
                      if (isVenueProfile) {
                        return (
                          <li key={beat.id} className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openLightbox(beat.coverUrl);
                              }}
                              className="relative h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-lg ring-1 ring-white/10 hover:ring-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                              aria-label={`Open photo: ${beat.title}`}
                            >
                              <Image
                                src={beat.coverUrl}
                                alt=""
                                width={56}
                                height={56}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            </button>
                          </li>
                        );
                      }

                      if (!beat.audioUrl) {
                        return (
                          <li key={beat.id} className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openLightbox(beat.coverUrl);
                              }}
                              className="relative h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-lg ring-1 ring-white/10 hover:ring-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                              aria-label={`Open photo: ${beat.title}`}
                            >
                              <Image
                                src={beat.coverUrl}
                                alt=""
                                width={56}
                                height={56}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            </button>
                          </li>
                        );
                      }

                      const active = playingMeta?.id === beat.id;
                      return (
                        <li key={beat.id} className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBeatOrPlay(beat);
                            }}
                            className={`group relative h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-lg ring-1 transition ${
                              active
                                ? "ring-amber-400/80"
                                : "ring-white/10 hover:ring-amber-500/50"
                            }`}
                            aria-label={
                              active && audioReady ? `Pause ${beat.title}` : `Play ${beat.title}`
                            }
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
                              {active && audioReady ? "⏸" : "▶"}
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
                Profile note
              </p>
              <p className="mt-1 text-sm text-zinc-200">
                {current.bio || current.highlight}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => advance("left")}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-zinc-800/80 text-zinc-300 transition hover:bg-zinc-700 sm:h-14 sm:w-14"
            aria-label="Pass"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={() => advance("right")}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-zinc-800/80 text-zinc-300 transition hover:bg-zinc-700 sm:h-14 sm:w-14"
            aria-label="Save for later"
          >
            ★
          </button>
        </div>
        <button
          type="button"
          onClick={undoLastSwipe}
          disabled={!lastSwipe}
          className="w-full rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-40"
        >
          Undo last swipe (Z)
        </button>
        <button
          type="button"
          onClick={() => advance("up")}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-xs sm:text-sm font-semibold text-zinc-950 shadow-lg shadow-orange-500/20 transition hover:opacity-95"
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
        <p className="text-center text-[11px] sm:text-xs text-zinc-600">
          Drag card left / right / up — or use the buttons
        </p>
      </div>
    </div>
  );
}
