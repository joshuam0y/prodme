"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import type { DbExtraBeat } from "@/lib/profile-beats";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { updateProfileBeats } from "./actions";

export type ProfileVenuePhotosInitial = {
  starCoverUrl: string;
  extras: DbExtraBeat[];
};

type ExtraSlot = {
  coverUrl: string;
  coverFile: File | null;
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-amber-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30";

function extFromFile(file: File): string {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName && byName.length <= 5 && /^[a-z0-9]+$/i.test(byName)) return byName;
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("png")) return "png";
  return "jpg";
}

async function uploadToBucket(userId: string, file: File, baseName: string) {
  const supabase = createBrowserSupabaseClient();
  const ext = extFromFile(file);
  const safeBase = baseName.replace(/[^a-z0-9-]/gi, "-").slice(0, 40);
  const path = `${userId}/${safeBase}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("profile-media")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });

  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
  return data.publicUrl as string;
}

export function ProfileVenuePhotosForm({
  initial,
}: {
  initial: ProfileVenuePhotosInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const refreshTimer = useRef<number | null>(null);

  const [message, setMessage] = useState<
    { kind: "ok"; text: string } | { kind: "err"; text: string } | null
  >(null);

  const [starCoverUrl, setStarCoverUrl] = useState(initial.starCoverUrl);
  const [starCoverFile, setStarCoverFile] = useState<File | null>(null);

  const [slots, setSlots] = useState<ExtraSlot[]>(
    initial.extras.length
      ? initial.extras.map((e) => ({
          coverUrl: e.cover_url,
          coverFile: null,
        }))
      : [],
  );

  useEffect(() => {
    return () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }
    };
  }, []);

  function setSlot(i: number, patch: Partial<ExtraSlot>) {
    setSlots((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function addSlot() {
    if (slots.length >= 5) return;
    setSlots((rows) => [
      ...rows,
      {
        coverUrl: "",
        coverFile: null,
      },
    ]);
  }

  function removeSlot(i: number) {
    setSlots((rows) => rows.filter((_, j) => j !== i));
  }

  function clearStar() {
    setStarCoverUrl("");
    setStarCoverFile(null);
  }

  async function buildPayloadForSave() {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Sign in to save previews.");
    }

    const starUrl =
      starCoverFile !== null
        ? await uploadToBucket(user.id, starCoverFile, "venue-star")
        : starCoverUrl.trim();

    const builtExtras: DbExtraBeat[] = [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const cover =
        s.coverFile !== null ? await uploadToBucket(user.id, s.coverFile, `venue-ex-${i}`) : s.coverUrl.trim();
      if (!cover) continue;

      builtExtras.push({
        title: `Photo ${builtExtras.length + 1}`,
        audio_url: null,
        cover_url: cover,
      });
    }

    return {
      star_beat_title: "Featured photo",
      star_beat_audio_url: null,
      star_beat_cover_url: starUrl || null,
      extra_beats: builtExtras,
    };
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        const payload = await buildPayloadForSave();
        const result = await updateProfileBeats(payload);
        if (!result.ok) {
          setMessage({ kind: "err", text: result.error });
          return;
        }

        setStarCoverUrl(payload.star_beat_cover_url ?? "");
        setSlots(
          payload.extra_beats.map((e) => ({
            coverUrl: e.cover_url,
            coverFile: null,
          })),
        );
        setStarCoverFile(null);
        setMessage({ kind: "ok", text: "Saved — venue photos will appear on Discover." });

        if (refreshTimer.current !== null) {
          window.clearTimeout(refreshTimer.current);
        }
        refreshTimer.current = window.setTimeout(() => {
          router.refresh();
        }, 2500);
      } catch (e) {
        setMessage({
          kind: "err",
          text: e instanceof Error ? e.message : "Upload failed.",
        });
      }
    });
  }

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
      <h2 className="text-sm font-semibold text-zinc-100">Venue photos</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Upload 1 featured photo and up to 5 more images. Venues don&apos;t need track
        audio — photos show what your space is like.
      </p>

      {message ? (
        <p
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            message.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200/95"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Featured photo
          </h3>
          {(starCoverUrl || starCoverFile) && (
            <button
              type="button"
              onClick={clearStar}
              className="text-xs text-zinc-500 underline decoration-zinc-600 hover:text-zinc-300"
            >
              Remove featured photo
            </button>
          )}
        </div>

        <label className="block text-xs font-medium text-zinc-500">
          Cover image (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setStarCoverFile(e.target.files?.[0] ?? null)}
            className={fieldClass}
          />
        </label>
        {starCoverUrl || starCoverFile ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-600">Featured preview</p>
            {starCoverFile ? (
              <p className="text-xs text-zinc-500">Selected file: {starCoverFile.name}</p>
            ) : null}
            {starCoverUrl ? (
              <div className="relative h-36 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950/40">
                <Image
                  src={starCoverUrl}
                  alt="Featured venue photo preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            More photos (max 5)
          </h3>
          <button
            type="button"
            onClick={addSlot}
            disabled={slots.length >= 5 || pending}
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-30"
          >
            Add photo
          </button>
        </div>

        {slots.length === 0 ? (
          <p className="text-sm text-zinc-600">No extra photos yet.</p>
        ) : (
          <ul className="space-y-6">
            {slots.map((s, i) => (
              <li
                key={i}
                className="rounded-xl border border-white/5 bg-zinc-950/40 p-4"
              >
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeSlot(i)}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Remove
                  </button>
                </div>

                <label className="block text-xs font-medium text-zinc-500">
                  Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setSlot(i, { coverFile: e.target.files?.[0] ?? null })
                    }
                    className={fieldClass}
                  />
                </label>

                {s.coverUrl || s.coverFile ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-zinc-600">
                      {s.coverFile ? `Selected: ${s.coverFile.name}` : "Current photo is set"}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="mt-8 w-full rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-40 sm:w-auto sm:px-8"
      >
        {pending ? "Saving…" : "Save photos"}
      </button>
    </section>
  );
}

