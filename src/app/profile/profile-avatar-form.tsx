"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { updateProfileBasics } from "./actions";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-amber-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30";

function extFromFile(file: File): string {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName && byName.length <= 5 && /^[a-z0-9]+$/i.test(byName)) return byName;
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("png")) return "png";
  return "jpg";
}

async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  const ext = extFromFile(file);
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("profile-media")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
  return data.publicUrl;
}

export function ProfileAvatarForm({ initialUrl }: { initialUrl: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const previewUrl = file ? URL.createObjectURL(file) : avatarUrl;

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
      <h2 className="text-sm font-semibold text-zinc-100">Profile photo</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Upload a square-friendly headshot or artist image. Others can tap it to view larger.
      </p>

      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200/95">
          {message}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-zinc-950/50">
          {previewUrl ? (
            <Image src={previewUrl} alt="Profile photo preview" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
              No photo
            </div>
          )}
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-500">
            Upload image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={fieldClass}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const supabase = createBrowserSupabaseClient();
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (!user) {
                      setMessage("Sign in to update your profile photo.");
                      return;
                    }
                    const nextUrl = file ? await uploadAvatar(user.id, file) : avatarUrl;
                    const result = await updateProfileBasics({ avatar_url: nextUrl || "" });
                    if (!result.ok) {
                      setMessage(result.error);
                      return;
                    }
                    setAvatarUrl(nextUrl || "");
                    setFile(null);
                    setMessage("Profile photo updated.");
                    router.refresh();
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "Upload failed.");
                  }
                });
              }}
              className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-40"
            >
              {pending ? "Saving..." : "Save photo"}
            </button>
            {(avatarUrl || file) ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await updateProfileBasics({ avatar_url: "" });
                    if (!result.ok) {
                      setMessage(result.error);
                      return;
                    }
                    setAvatarUrl("");
                    setFile(null);
                    setMessage("Profile photo removed.");
                    router.refresh();
                  });
                }}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-40"
              >
                Remove photo
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
