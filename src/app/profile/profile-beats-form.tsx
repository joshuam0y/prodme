"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { DbExtraBeat } from "@/lib/profile-beats";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { updateProfileBeats } from "./actions";

export type ProfileBeatsInitial = {
  starTitle: string;
  starAudioUrl: string;
  starCoverUrl: string;
  extras: DbExtraBeat[];
};

type ExtraSlot = {
  title: string;
  audioUrl: string;
  coverUrl: string;
  audioFile: File | null;
  coverFile: File | null;
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-amber-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30";

function extFromFile(file: File): string {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName && byName.length <= 5 && /^[a-z0-9]+$/i.test(byName)) return byName;
  if (file.type.includes("mpeg")) return "mp3";
  if (file.type.includes("wav")) return "wav";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("png")) return "png";
  return "jpg";
}

async function uploadToBucket(
  userId: string,
  file: File,
  baseName: string,
): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  const ext = extFromFile(file);
  const safeBase = baseName.replace(/[^a-z0-9-]/gi, "-").slice(0, 40);
  const path = `${userId}/${safeBase}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("profile-media").upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
  return data.publicUrl;
}

export function ProfileBeatsForm({ initial }: { initial: ProfileBeatsInitial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const refreshTimer = useRef<number | null>(null);
  const [message, setMessage] = useState<
    { kind: "ok"; text: string } | { kind: "err"; text: string } | null
  >(null);
  const [starTitle, setStarTitle] = useState(initial.starTitle);
  const [starAudioUrl, setStarAudioUrl] = useState(initial.starAudioUrl);
  const [starCoverUrl, setStarCoverUrl] = useState(initial.starCoverUrl);
  const [starAudioFile, setStarAudioFile] = useState<File | null>(null);
  const [starCoverFile, setStarCoverFile] = useState<File | null>(null);
  const [slots, setSlots] = useState<ExtraSlot[]>(() =>
    initial.extras.length
      ? initial.extras.map((e) => ({
          title: e.title,
          audioUrl: e.audio_url,
          coverUrl: e.cover_url,
          audioFile: null,
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
        title: "",
        audioUrl: "",
        coverUrl: "",
        audioFile: null,
        coverFile: null,
      },
    ]);
  }

  function removeSlot(i: number) {
    setSlots((rows) => rows.filter((_, j) => j !== i));
  }

  function clearStar() {
    setStarTitle("");
    setStarAudioUrl("");
    setStarCoverUrl("");
    setStarAudioFile(null);
    setStarCoverFile(null);
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setMessage({ kind: "err", text: "Sign in to save." });
          return;
        }

        let starAudio =
          starAudioFile !== null
            ? await uploadToBucket(user.id, starAudioFile, "star-audio")
            : starAudioUrl.trim();
        let starCover =
          starCoverFile !== null
            ? await uploadToBucket(user.id, starCoverFile, "star-cover")
            : starCoverUrl.trim();

        if (!starAudio) {
          starCover = "";
        } else if (!starTitle.trim()) {
          setMessage({ kind: "err", text: "Add a title for your star track." });
          return;
        }

        const built: DbExtraBeat[] = [];
        for (let i = 0; i < slots.length; i++) {
          const s = slots[i];
          const t = s.title.trim();
          if (!t) continue;
          let au =
            s.audioFile !== null
              ? await uploadToBucket(user.id, s.audioFile, `extra-${i}-audio`)
              : s.audioUrl.trim();
          if (!au) {
            setMessage({
              kind: "err",
              text: `Extra “${t}”: add an audio file or URL.`,
            });
            return;
          }
          let cov =
            s.coverFile !== null
              ? await uploadToBucket(user.id, s.coverFile, `extra-${i}-cover`)
              : s.coverUrl.trim();
          built.push({
            title: t,
            audio_url: au,
            cover_url: cov,
          });
        }

        const result = await updateProfileBeats({
          star_beat_title: starAudio ? starTitle.trim() : null,
          star_beat_audio_url: starAudio || null,
          star_beat_cover_url: starCover || null,
          extra_beats: built,
        });

        if (!result.ok) {
          setMessage({ kind: "err", text: result.error });
          return;
        }

        setStarAudioFile(null);
        setStarCoverFile(null);
        setMessage({
          kind: "ok",
          text: "Saved — discover will use these previews.",
        });
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
      <h2 className="text-sm font-semibold text-zinc-100">Discover previews</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Upload your star track and up to five more clips. Files go to your private folder in
        Supabase Storage (bucket <code className="text-zinc-400">profile-media</code>).
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
            Star track
          </h3>
          {(starAudioUrl || starAudioFile) && (
            <button
              type="button"
              onClick={clearStar}
              className="text-xs text-zinc-500 underline decoration-zinc-600 hover:text-zinc-300"
            >
              Remove star track
            </button>
          )}
        </div>
        <label className="block text-xs font-medium text-zinc-500">
          Title
          <input
            type="text"
            value={starTitle}
            onChange={(e) => setStarTitle(e.target.value)}
            placeholder="e.g. Late Night Keys"
            className={fieldClass}
          />
        </label>
        <label className="block text-xs font-medium text-zinc-500">
          Audio file (mp3, wav, m4a…)
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setStarAudioFile(e.target.files?.[0] ?? null)}
            className={fieldClass}
          />
        </label>
        {starAudioUrl && !starAudioFile ? (
          <p className="text-xs text-zinc-600">
            Current:{" "}
            <a href={starAudioUrl} className="text-amber-500/90 hover:underline" target="_blank" rel="noreferrer">
              open link
            </a>
          </p>
        ) : null}
        <label className="block text-xs font-medium text-zinc-500">
          Cover image (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setStarCoverFile(e.target.files?.[0] ?? null)}
            className={fieldClass}
          />
        </label>
        {starCoverUrl && !starCoverFile ? (
          <p className="text-xs text-zinc-600">
            Current cover:{" "}
            <a href={starCoverUrl} className="text-amber-500/90 hover:underline" target="_blank" rel="noreferrer">
              open
            </a>
          </p>
        ) : null}
      </div>

      <div className="mt-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            More beats (max 5)
          </h3>
          <button
            type="button"
            onClick={addSlot}
            disabled={slots.length >= 5 || pending}
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-30"
          >
            Add beat
          </button>
        </div>

        {slots.length === 0 ? (
          <p className="text-sm text-zinc-600">No extra beats yet.</p>
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
                  Title
                  <input
                    type="text"
                    value={s.title}
                    onChange={(e) => setSlot(i, { title: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-500">
                  Audio
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) =>
                      setSlot(i, { audioFile: e.target.files?.[0] ?? null })
                    }
                    className={fieldClass}
                  />
                </label>
                {s.audioUrl && !s.audioFile ? (
                  <p className="mt-1 text-xs text-zinc-600">
                    Current:{" "}
                    <a
                      href={s.audioUrl}
                      className="text-amber-500/90 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      open
                    </a>
                  </p>
                ) : null}
                <label className="block text-xs font-medium text-zinc-500">
                  Cover (optional)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setSlot(i, { coverFile: e.target.files?.[0] ?? null })
                    }
                    className={fieldClass}
                  />
                </label>
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
        {pending ? "Saving…" : "Save previews"}
      </button>
    </section>
  );
}
