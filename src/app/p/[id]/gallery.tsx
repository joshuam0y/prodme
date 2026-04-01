"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

type Item = { url: string; label: string };

export function ProfileGallery({
  profileId,
  items,
  title = "Gallery",
}: {
  profileId: string;
  items: Item[];
  title?: string;
}) {
  const slides = useMemo(() => items.filter((i) => i.url.trim()), [items]);
  if (!slides.length) return null;

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
      <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">{title}</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {slides.slice(0, 6).map((s, idx) => (
          <Link
            key={`${s.url}-${idx}`}
            href={`/p/${profileId}?gallery=1#img-${idx}`}
            className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-zinc-800 focus-visible:outline-none"
            aria-label={`Open photo: ${s.label}`}
          >
            <Image src={s.url} alt={s.label} fill className="object-cover" unoptimized />
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ProfileGalleryModal({
  profileId,
  items,
}: {
  profileId: string;
  items: Item[];
}) {
  const slides = useMemo(() => items.filter((i) => i.url.trim()), [items]);
  if (!slides.length) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery"
    >
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
        <Link
          href={`/p/${profileId}`}
          className="rounded-full border border-white/20 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-900"
        >
          Close
        </Link>
        <p className="text-xs text-zinc-400">Swipe / scroll</p>
      </div>
      <div
        className="h-full w-full overflow-x-auto overflow-y-hidden"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="flex h-full w-max">
          {slides.map((s, idx) => (
            <div
              key={`${s.url}-${idx}`}
              id={`img-${idx}`}
              className="relative h-full w-[100vw]"
              style={{ scrollSnapAlign: "center" }}
            >
              <Image src={s.url} alt={s.label} fill className="object-contain" unoptimized />
              <div className="absolute bottom-5 left-0 right-0 flex justify-center">
                <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs text-zinc-100">
                  {idx + 1} / {slides.length}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileAvatarModal({
  profileId,
  imageUrl,
  label,
}: {
  profileId: string;
  imageUrl: string;
  label: string;
}) {
  const src = imageUrl.trim();
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Profile photo"
    >
      <Link
        href={`/p/${profileId}`}
        className="absolute right-4 top-4 rounded-full border border-white/20 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-900"
      >
        Close
      </Link>
      <div className="relative h-[min(70vw,28rem)] w-[min(70vw,28rem)] overflow-hidden rounded-full border border-white/10 bg-zinc-900 shadow-2xl">
        <Image src={src} alt={label} fill className="object-cover" unoptimized />
      </div>
    </div>
  );
}

