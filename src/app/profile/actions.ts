"use server";

import { revalidatePath } from "next/cache";
import {
  enrichProfileWithAi,
  generateProfileCoachSuggestion,
  generateProfileEmbedding,
  moderateTextWithAi,
} from "@/lib/ai/client";
import type { ProfileCoachInput } from "@/lib/ai/types";
import { createClient } from "@/lib/supabase/server";
import { isAiProfileCoachConfigured, isSupabaseConfigured } from "@/lib/env";
import type { DbExtraBeat } from "@/lib/profile-beats";

async function refreshAiProfileData(
  userId: string,
  profileInput: ProfileCoachInput,
): Promise<void> {
  if (!isAiProfileCoachConfigured()) return;

  try {
    const ai = await enrichProfileWithAi(profileInput);
    const supabase = await createClient();
    await supabase
      .from("profiles")
      .update({
        ai_summary: ai.summary || null,
        ai_tags: ai.tags,
        ai_profile_score: ai.score,
        ai_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } catch {
    // Best-effort only. The user-facing save should still succeed.
  }
}

async function refreshProfileEmbedding(
  userId: string,
  profileInput: ProfileCoachInput,
): Promise<void> {
  if (!isAiProfileCoachConfigured()) return;

  try {
    const { sourceText, embeddingText } = await generateProfileEmbedding(profileInput);
    const supabase = await createClient();
    await supabase.rpc("set_profile_embedding", {
      p_user_id: userId,
      p_source_text: sourceText,
      p_embedding_text: embeddingText,
    });
  } catch {
    // Best-effort only.
  }
}

async function moderateProfileText(profileInput: ProfileCoachInput): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isAiProfileCoachConfigured()) return { ok: true };
  const text = [
    profileInput.displayName,
    profileInput.niche,
    profileInput.goal,
    profileInput.lookingFor,
    profileInput.prompt1Question,
    profileInput.prompt1Answer,
    profileInput.prompt2Question,
    profileInput.prompt2Answer,
  ]
    .filter(Boolean)
    .join("\n");
  if (!text.trim()) return { ok: true };

  try {
    const moderation = await moderateTextWithAi({ text, context: "profile" });
    if (moderation.status === "block") {
      return {
        ok: false,
        error: `Profile update blocked: ${moderation.reason}`,
      };
    }
    if (moderation.status === "warn") {
      return {
        ok: false,
        error: `Profile update looks risky: ${moderation.reason}`,
      };
    }
  } catch {
    // Best-effort only.
  }
  return { ok: true };
}

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

  const { data: myRow } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (myRow?.role ?? "").toLowerCase();
  const isVenue = role.includes("venue") || role.includes("promoter");

  const extras = payload.extra_beats.slice(0, 5);
  if (extras.length !== payload.extra_beats.length) {
    return { ok: false, error: "You can add at most five extra beats." };
  }

  const starAudio = payload.star_beat_audio_url?.trim() || null;
  const starCover = payload.star_beat_cover_url?.trim() || null;
  let starTitle = payload.star_beat_title?.trim() || null;

  if (starCover && !isHttps(starCover)) {
    return { ok: false, error: "Star track cover must use an HTTPS URL." };
  }

  if (!starAudio) {
    // Venues: cover-only is expected.
    // Creators: allow cover-only so users can add artwork / moodboard visuals.
    if (!isVenue) starTitle = null;
  } else {
    if (!starTitle && !isVenue) {
      return { ok: false, error: "Add a title for your star track." };
    }
    if (!isHttps(starAudio)) {
      return { ok: false, error: "Star track audio must use an HTTPS URL." };
    }
  }

  for (let i = 0; i < extras.length; i++) {
    const e = extras[i];
    const t = e.title.trim();
    if (!t) {
      return { ok: false, error: `Extra beat ${i + 1}: add a title.` };
    }
    const cover = (e.cover_url ?? "").trim();
    const audio = e.audio_url?.trim() || null;

    if (isVenue) {
      // Venues: require cover photos; audio is optional.
      if (!cover) {
        return { ok: false, error: `Extra beat ${i + 1}: add a cover image URL.` };
      }
      if (!isHttps(cover)) {
        return { ok: false, error: `Extra beat “${t}”: cover must use an HTTPS URL.` };
      }
      if (audio && !isHttps(audio)) {
        return {
          ok: false,
          error: `Extra beat “${t}”: audio (if provided) must use an HTTPS URL.`,
        };
      }
      continue;
    }

    // Creators/DJs: allow audio-only, cover-only, or both (moodboard visuals).
    if (!audio && !cover) {
      return {
        ok: false,
        error: `Extra beat “${t}”: add an audio URL or a cover image URL.`,
      };
    }
    if (audio && !isHttps(audio)) {
      return {
        ok: false,
        error: `Extra beat “${t}”: audio must use an HTTPS URL.`,
      };
    }
    if (cover && !isHttps(cover)) {
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

export type UpdateProfileLocationPayload = {
  city?: string;
  neighborhood?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_radius_km?: number;
};

export async function updateProfileLocation(
  payload: UpdateProfileLocationPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to update your location." };

  const city = (payload.city ?? "").trim();
  const neighborhood = (payload.neighborhood ?? "").trim();
  const radius = Math.max(1, Math.min(200, Math.round(payload.location_radius_km ?? 25)));
  const lat = payload.latitude;
  const lng = payload.longitude;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const { error } = await supabase
    .from("profiles")
    .update({
      city: city || null,
      neighborhood: neighborhood || null,
      latitude: hasCoords ? lat : null,
      longitude: hasCoords ? lng : null,
      location_radius_km: radius,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  revalidatePath("/explore");
  revalidatePath(`/p/${user.id}`);
  return { ok: true };
}

export type UpdateProfileBasicsPayload = {
  display_name?: string;
  avatar_url?: string | null;
  niche?: string;
  goal?: string;
  city?: string;
  looking_for?: string;
  prompt_1_question?: string;
  prompt_1_answer?: string;
  prompt_2_question?: string;
  prompt_2_answer?: string;
};

export async function updateProfileBasics(
  payload: UpdateProfileBasicsPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to update profile." };

  const patch: Record<string, string | null> = {};
  if (typeof payload.display_name === "string") patch.display_name = payload.display_name.trim();
  if (typeof payload.avatar_url === "string") patch.avatar_url = payload.avatar_url.trim() || null;
  if (typeof payload.niche === "string") patch.niche = payload.niche.trim();
  if (typeof payload.goal === "string") patch.goal = payload.goal.trim();
  if (typeof payload.city === "string") patch.city = payload.city.trim();
  if (typeof payload.looking_for === "string") patch.looking_for = payload.looking_for.trim();
  if (typeof payload.prompt_1_question === "string") patch.prompt_1_question = payload.prompt_1_question.trim();
  if (typeof payload.prompt_1_answer === "string") patch.prompt_1_answer = payload.prompt_1_answer.trim();
  if (typeof payload.prompt_2_question === "string") patch.prompt_2_question = payload.prompt_2_question.trim();
  if (typeof payload.prompt_2_answer === "string") patch.prompt_2_answer = payload.prompt_2_answer.trim();
  if (Object.keys(patch).length === 0) return { ok: true };

  const aiRelevantFields = [
    "display_name",
    "niche",
    "goal",
    "looking_for",
    "prompt_1_question",
    "prompt_1_answer",
    "prompt_2_question",
    "prompt_2_answer",
  ];
  if (aiRelevantFields.some((field) => field in patch)) {
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select(
        "display_name, role, niche, goal, city, looking_for, prompt_1_question, prompt_1_answer, prompt_2_question, prompt_2_answer",
      )
      .eq("id", user.id)
      .maybeSingle();

    const moderationResult = await moderateProfileText({
      displayName:
        typeof patch.display_name === "string"
          ? patch.display_name
          : currentProfile?.display_name?.trim() || "",
      role: currentProfile?.role?.trim() || "",
      niche:
        typeof patch.niche === "string" ? patch.niche : currentProfile?.niche?.trim() || "",
      goal:
        typeof patch.goal === "string" ? patch.goal : currentProfile?.goal?.trim() || "",
      city:
        typeof patch.city === "string" ? patch.city : currentProfile?.city?.trim() || "",
      lookingFor:
        typeof patch.looking_for === "string"
          ? patch.looking_for
          : currentProfile?.looking_for?.trim() || "",
      prompt1Question:
        typeof patch.prompt_1_question === "string"
          ? patch.prompt_1_question
          : currentProfile?.prompt_1_question?.trim() || "",
      prompt1Answer:
        typeof patch.prompt_1_answer === "string"
          ? patch.prompt_1_answer
          : currentProfile?.prompt_1_answer?.trim() || "",
      prompt2Question:
        typeof patch.prompt_2_question === "string"
          ? patch.prompt_2_question
          : currentProfile?.prompt_2_question?.trim() || "",
      prompt2Answer:
        typeof patch.prompt_2_answer === "string"
          ? patch.prompt_2_answer
          : currentProfile?.prompt_2_answer?.trim() || "",
    });
    if (!moderationResult.ok) return moderationResult;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  if (aiRelevantFields.some((field) => field in patch)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "display_name, role, niche, goal, city, looking_for, prompt_1_question, prompt_1_answer, prompt_2_question, prompt_2_answer",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      const profileInput = {
        displayName: profile.display_name?.trim() || "",
        role: profile.role?.trim() || "",
        niche: profile.niche?.trim() || "",
        goal: profile.goal?.trim() || "",
        city: profile.city?.trim() || "",
        lookingFor: profile.looking_for?.trim() || "",
        prompt1Question: profile.prompt_1_question?.trim() || "",
        prompt1Answer: profile.prompt_1_answer?.trim() || "",
        prompt2Question: profile.prompt_2_question?.trim() || "",
        prompt2Answer: profile.prompt_2_answer?.trim() || "",
      };
      await refreshAiProfileData(user.id, profileInput);
      await refreshProfileEmbedding(user.id, profileInput);
    }
  }

  revalidatePath("/profile");
  revalidatePath("/explore");
  revalidatePath(`/p/${user.id}`);
  return { ok: true };
}

export async function generateProfileBasicsSuggestions(
  payload: ProfileCoachInput,
): Promise<
  | {
      ok: true;
      suggestion: {
        niche: string;
        goal: string;
        lookingFor: string;
        prompt1Question: string;
        prompt1Answer: string;
        prompt2Question: string;
        prompt2Answer: string;
        summary: string;
        tags: string[];
        score: number;
      };
    }
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!isAiProfileCoachConfigured()) {
    return { ok: false, error: "AI profile coach is not configured yet." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to use AI profile suggestions." };

  try {
    const suggestion = await generateProfileCoachSuggestion(payload);
    const { error } = await supabase
      .from("profiles")
      .update({
        ai_summary: suggestion.summary || null,
        ai_tags: suggestion.tags,
        ai_profile_score: suggestion.score,
        ai_updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/profile");
    return { ok: true, suggestion };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "AI profile suggestions failed.",
    };
  }
}
