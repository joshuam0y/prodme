"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { DbExtraBeat } from "@/lib/profile-beats";

export type UpdateProfileBeatsPayload = {
  star_beat_title: string | null;
  star_beat_audio_url: string | null;
  star_beat_cover_url: string | null;
  extra_beats: DbExtraBeat[];
};

function isHttps(u: string): boolean {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
}

export async function updateProfileBeats(
  payload: UpdateProfileBeatsPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in to save previews." };
  }

  const extras = payload.extra_beats.slice(0, 5);
  if (extras.length !== payload.extra_beats.length) {
    return { ok: false, error: "You can add at most five extra beats." };
  }

  let starAudio = payload.star_beat_audio_url?.trim() || null;
  let starCover = payload.star_beat_cover_url?.trim() || null;
  let starTitle = payload.star_beat_title?.trim() || null;

  if (!starAudio) {
    starTitle = null;
    starCover = null;
  } else {
    if (!starTitle) {
      return { ok: false, error: "Add a title for your star track." };
    }
    if (!isHttps(starAudio)) {
      return { ok: false, error: "Star track audio must use an HTTPS URL." };
    }
    if (starCover && !isHttps(starCover)) {
      return { ok: false, error: "Star track cover must use an HTTPS URL." };
    }
  }

  for (let i = 0; i < extras.length; i++) {
    const e = extras[i];
    const t = e.title.trim();
    if (!t) {
      return { ok: false, error: `Extra beat ${i + 1}: add a title.` };
    }
    if (!isHttps(e.audio_url)) {
      return {
        ok: false,
        error: `Extra beat “${t}”: audio must use an HTTPS URL.`,
      };
    }
    if (e.cover_url.trim() && !isHttps(e.cover_url)) {
      return {
        ok: false,
        error: `Extra beat “${t}”: cover must use an HTTPS URL.`,
      };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      star_beat_title: starTitle,
      star_beat_audio_url: starAudio,
      star_beat_cover_url: starCover,
      extra_beats: extras,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/explore");
  revalidatePath(`/p/${user.id}`);
  return { ok: true };
}
