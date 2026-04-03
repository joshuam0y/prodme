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
import { ProfileAvatar } from "@/components/profile-avatar";
import { buildDefaultDraftOpener } from "@/lib/match-openers";
import type { BeatPreview, ProfileCard } from "@/lib/types";
import { isUuid } from "@/lib/uuid";
import { profileInitials } from "@/lib/match-ui";

type Props = {
  profiles: ProfileCard[];
  viewerId?: string | null;
};

const roleLabel: Record<ProfileCard["role"], string> = {
  producer: "Producer",
  artist: "Artist",
  dj: "DJ",
  engineer: "Engineer",
  venue: "Venue",
};

const THRESHOLD_PX = 56;
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
type SwipeDir = "left" | "right";

export function SwipeStack({ profiles, viewerId }: Props) {
  const signedIn = Boolean(viewerId && viewerId.trim());
  const router = useRouter();

  const dismissedKey = signedIn && viewerId ? `prodlink.discover.dismissedIds:${viewerId}` : "prodlink.discover.dismissedIds:anon";

  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lastSwipe, setLastSwipe] = useState<{ id: string; dir: SwipeDir } | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const pointerDown = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const [playingMeta, setPlayingMeta] = useState<PlayingMeta | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [matchModal, setMatchModal] = useState<{
    id: string;
    name: string;
    initials: string;
    role: ProfileCard["role"];
  } | null>(null);
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
  const showCatchUp = profiles.length === 0 || done;

  const runStartOver = useCallback(() => {
    setDismissed(new Set());
    persistDismissedIds(dismissedKey, new Set());
    if (signedIn) {
      const path =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/explore";
      void resetDiscoverSwipes(path).then(() => router.refresh());
    }
  }, [dismissedKey, router, signedIn]);

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
    const next = visibleProfiles[1];
    if (!next || next.role === "venue" || !next.starBeat?.audioUrl) return;
    const preloader = new Audio();
    preloader.preload = "auto";
    preloader.src = next.starBeat.audioUrl;
    preloader.load();
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
      if (matchModal) return;
      const action = dir === "left" ? "pass" : "save";
      if (typeof window !== "undefined" && dir === "right") {
        // Subtle haptic on "like" commit.
        window.navigator?.vibrate?.(8);
      }
      if (isUuid(top.id)) {
        if (action === "save") {
          void recordDiscoverAction(top.id, action)
            .then((res) => {
              if (res.ok && res.matched) {
                setMatchModal({
                  id: top.id,
                  name: top.displayName,
                  initials: profileInitials(top.displayName),
                  role: top.role,
                });
                if (typeof window !== "undefined") window.navigator?.vibrate?.([12, 25, 12]);
              }
            })
            .catch(() => {});
        } else {
          // Fire-and-forget, but swallow errors to avoid unhandled promise rejections.
          void recordDiscoverAction(top.id, action).catch(() => {});
        }
      }
      const a = audioRef.current;
      if (a) {
        a.pause();
      }
      const dismissedId = top.id;
      setLastSwipe({ id: dismissedId, dir });
      setDrag({ x: 0, y: 0 });
      setExitDir(dir);
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
    [visibleProfiles, signedIn, dismissedKey, matchModal, router],
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
    if (matchModal) return;

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
    if (matchModal) return;
    if (!pointerDown.current || exitDir) return;
    setDrag({
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
    });
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (matchModal) return;
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

    if (horizontal) {
      advance(dx < 0 ? "left" : "right");
      return;
    }
    setDrag({ x: 0, y: 0 });
  };

  if (showCatchUp) {
    return (
      <div className="relative mx-auto w-full max-w-md">
        <div
          className="flex min-h-[min(420px,55vh)] flex-col items-center justify-center px-4 py-8"
          role="status"
          aria-live="polite"
        >
          <div className="w-full rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 px-8 py-10 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-sm sm:px-10 sm:py-12">
            <div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/12 ring-1 ring-amber-500/35"
              aria-hidden
            >
              <svg
                className="h-10 w-10 text-amber-400/95"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-500/90">
              All clear
            </p>
            <h2 className="mt-3 text-pretty text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
              You&apos;re caught up for now
            </h2>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-zinc-400">
              More profiles will show up as people join prodLink. Open filters to widen your radius or
              try a different sort—then swipe again when you&apos;re ready.
            </p>
            <button
              type="button"
              onClick={() => runStartOver()}
              className="mt-8 w-full rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              Start over
            </button>
          </div>
        </div>
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
  const hintAction =
    showHint && horizontalIntent && absX > 18 ? (drag.x < 0 ? "Pass" : "Save") : null;
  const stamp =
    showHint && horizontalIntent && absX > 26
      ? drag.x < 0
        ? { text: "NOPE", side: "left" as const, tone: "zinc" as const }
        : { text: "LIKE", side: "right" as const, tone: "emerald" as const }
      : null;
  const stampOpacity = Math.min(1, Math.max(0, (absX - 26) / 90));

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      {matchModal ? (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="It's a match"
        >
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/90">
              It&apos;s a match
            </p>
            <div className="mt-5 flex items-center justify-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-200 ring-1 ring-amber-500/30">
                You
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-200 ring-1 ring-emerald-500/25">
                {matchModal.initials}
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-zinc-300">
              You and <span className="font-semibold text-zinc-100">{matchModal.name}</span> liked each other.
            </p>
            <div className="mt-6 grid gap-2">
              <Link
                href={`/matches/${matchModal.id}?draft=${encodeURIComponent(
                  buildDefaultDraftOpener(matchModal.name, matchModal.role),
                )}`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-amber-500 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
              >
                Message now
              </Link>
              <button
                type="button"
                onClick={() => setMatchModal(null)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
              >
                Keep swiping
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <audio
        ref={audioRef}
        className="hidden"
        preload="auto"
        onPlay={() => setAudioReady(true)}
        onPause={() => setAudioReady(false)}
        onEnded={() => setAudioReady(false)}
      />

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

      <div
        role="group"
        aria-label="Profile card — drag left to pass, right to save"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={dragTransform}
        className={`relative z-10 min-h-[560px] sm:min-h-[680px] touch-pan-y overflow-hidden rounded-[30px] border border-white/10 bg-zinc-900/60 shadow-[0_30px_100px_rgba(0,0,0,0.3)] select-none ${
          dragging && !exitDir ? "cursor-grabbing" : "cursor-grab"
        } ${
          dragging && !exitDir
            ? "transition-none"
            : "transition-transform duration-200 ease-out motion-reduce:transition-none"
        } ${
          exitDir === "left"
            ? "-translate-x-[120%] -rotate-6 opacity-0"
            : exitDir === "right"
              ? "translate-x-[120%] rotate-6 opacity-0"
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
        {stamp ? (
          <div
            className={`pointer-events-none absolute top-4 z-30 ${
              stamp.side === "left" ? "left-4" : "right-4"
            }`}
            style={{ opacity: stampOpacity, transform: `rotate(${stamp.side === "left" ? -12 : 12}deg)` }}
            aria-hidden
          >
            <span
              className={`inline-flex rounded-lg border-2 px-3 py-1 text-lg font-extrabold tracking-widest ${
                stamp.tone === "emerald"
                  ? "border-emerald-400 text-emerald-300"
                  : "border-zinc-400 text-zinc-200"
              } motion-reduce:transition-none`}
            >
              {stamp.text}
            </span>
          </div>
        ) : null}
        <div
          className={`h-40 bg-gradient-to-br ${current.accent} opacity-95 sm:h-48`}
          aria-hidden
        />
        <div className="space-y-5 px-5 pb-7 pt-2 sm:px-7 sm:pb-9 sm:pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <ProfileAvatar
                name={current.displayName}
                avatarUrl={current.avatarUrl}
                sizeClassName="h-14 w-14"
                textClassName="text-sm font-semibold text-zinc-100"
                ringClassName="border border-white/10 bg-zinc-800/60"
              />
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-[2rem]">
                  {current.displayName}
                </h2>
                <p className="mt-1 text-sm text-zinc-300 sm:text-base">
                  {roleLabel[current.role]} · {current.city}
                  {typeof current.distanceKm === "number" ? ` · ${Math.round(current.distanceKm)} km away` : ""}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {current.likedYou ? (
                    <span className="inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-200">
                      Liked you
                    </span>
                  ) : null}
                  {current.rankReason ? (
                    <span className="inline-flex rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-200">
                      {current.rankReason}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] sm:text-xs text-zinc-200">
              {current.niche}
            </span>
          </div>
          {star ? (
            <p className="max-w-2xl text-base leading-relaxed text-zinc-200">{current.bio}</p>
          ) : null}
          {star && heroCover ? (
            <div className="space-y-3 rounded-[26px] border border-white/5 bg-white/[0.05] p-4 sm:p-5">
              <div className="flex flex-col items-start gap-4 sm:flex-row">
                {isVenueProfile || isPhotoOnlyStar ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLightbox(heroCover);
                    }}
                    className="relative h-40 w-full shrink-0 overflow-hidden rounded-2xl bg-zinc-800 ring-1 ring-white/10 hover:ring-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 sm:h-36 sm:w-36"
                    aria-label="Open featured photo"
                  >
                    <Image
                      src={heroCover}
                      alt=""
                      width={220}
                      height={220}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </button>
                ) : (
                  <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-2xl bg-zinc-800 ring-1 ring-white/10 sm:h-36 sm:w-36">
                    <Image
                      src={heroCover}
                      alt=""
                      width={220}
                      height={220}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
                      playingStar ? "text-amber-500/90" : "text-zinc-400"
                    }`}
                  >
                    {isVenueProfile
                      ? "Featured venue photo"
                      : isPhotoOnlyStar
                        ? "Featured photo"
                        : playingStar
                          ? "Now playing"
                          : "Featured audio"}
                  </p>
                  <p className="mt-1 truncate text-xl font-semibold text-zinc-100">
                    {isVenueProfile ? star.title : playingMeta?.title ?? star.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {isVenueProfile
                      ? "Lead with the room. Open photos to see the space and keep swiping if the vibe fits."
                      : isPhotoOnlyStar
                        ? "Visual-first preview for this profile."
                        : "Hear the clip first, then read the profile below if the sound feels right."}
                  </p>
                  {isVenueProfile || isPhotoOnlyStar ? (
                    <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-amber-300/85">
                      Tap photo to expand
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    {isVenueProfile || isPhotoOnlyStar ? null : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMainPlay();
                          }}
                          className="rounded-full bg-amber-500/20 px-4 py-1.5 text-xs font-medium text-amber-300 ring-1 ring-amber-500/35 transition hover:bg-amber-500/30"
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
                            className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
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
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
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
                              className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-white/10 hover:ring-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
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
                              className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-white/10 hover:ring-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
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
                            className={`group relative h-14 w-14 overflow-hidden rounded-lg ring-1 transition ${
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
          ) : null}
          {current.lookingFor || current.matchWhy?.length ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
              {current.lookingFor ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Looking for
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    {current.lookingFor}
                  </p>
                </div>
              ) : null}
              {current.matchWhy?.length ? (
                <div className={current.lookingFor ? "mt-4" : ""}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Why this could fit
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {current.matchWhy.slice(0, 3).map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-zinc-300"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {current.prompt1Question && current.prompt1Answer ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Featured prompt
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-100">
                {current.prompt1Question}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                {current.prompt1Answer}
              </p>
            </div>
          ) : null}
          {current.prompt2Question && current.prompt2Answer ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                More from their profile
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-100">
                {current.prompt2Question}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                {current.prompt2Answer}
              </p>
            </div>
          ) : null}
          {current.goal ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Current focus
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                {current.goal}
              </p>
            </div>
          ) : null}
          {!star || !heroCover ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Profile note
              </p>
              <p className="mt-1 text-sm text-zinc-200">
                {current.bio || current.highlight}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {nextProfile ? (
        <div className="pointer-events-none mt-2 rounded-xl border border-white/10 bg-zinc-900/45 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Up next</p>
          <p className="mt-0.5 truncate text-sm font-medium text-zinc-300">
            {nextProfile.displayName} · {roleLabel[nextProfile.role]}
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-4">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/45 px-4 py-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Quick actions
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            This card is the profile. Lead with the photo or clip, skim the key sections, then save
            or pass without leaving discover.
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => advance("left")}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-zinc-800/80 text-zinc-300 transition hover:bg-zinc-700 sm:h-14 sm:w-14 motion-reduce:transition-none"
            aria-label="Pass"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={() => advance("right")}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-zinc-800/80 text-zinc-300 transition hover:bg-zinc-700 sm:h-14 sm:w-14 motion-reduce:transition-none"
            aria-label="Save for later"
          >
            ★
          </button>
        </div>
        <button
          type="button"
          onClick={undoLastSwipe}
          disabled={!lastSwipe}
          className="w-full rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-40 motion-reduce:transition-none"
        >
          Undo last swipe (Z)
        </button>
      </div>
    </div>
  );
}
