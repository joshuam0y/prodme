import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/uuid";
import { beatsFromProfileRow } from "@/lib/profile-beats";
import { inferProfileRole } from "@/lib/discover-profiles";
import type { MobileApiResponse, MobilePublicProfile } from "@/lib/mobile-api/types";
import type { DbProfile } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !isUuid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_target" } satisfies MobileApiResponse<never>, {
      status: 400,
    });
  }

  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, role, niche, goal, city, neighborhood, looking_for, prompt_1_question, prompt_1_answer, prompt_2_question, prompt_2_answer, onboarding_completed_at, star_beat_title, star_beat_audio_url, star_beat_cover_url, extra_beats",
    )
    .eq("id", id)
    .not("onboarding_completed_at", "is", null)
    .maybeSingle();

  if (error || !row?.onboarding_completed_at) {
    return NextResponse.json({ ok: false, error: "not_found" } satisfies MobileApiResponse<never>, {
      status: 404,
    });
  }

  const profile = row as DbProfile;
  const role = inferProfileRole(profile.role ?? null);
  const { starBeat, extraBeats } = beatsFromProfileRow({
    id: profile.id,
    star_beat_title: profile.star_beat_title ?? null,
    star_beat_audio_url: profile.star_beat_audio_url ?? null,
    star_beat_cover_url: profile.star_beat_cover_url ?? null,
    extra_beats: profile.extra_beats,
  });

  const data: MobilePublicProfile = {
    id: profile.id,
    displayName: profile.display_name?.trim() || "Member",
    role,
    city: profile.city?.trim() || null,
    neighborhood: profile.neighborhood?.trim() || null,
    niche: profile.niche?.trim() || null,
    goal: profile.goal?.trim() || null,
    lookingFor: profile.looking_for?.trim() || null,
    prompt1Question: profile.prompt_1_question?.trim() || null,
    prompt1Answer: profile.prompt_1_answer?.trim() || null,
    prompt2Question: profile.prompt_2_question?.trim() || null,
    prompt2Answer: profile.prompt_2_answer?.trim() || null,
    onboardingCompletedAt: profile.onboarding_completed_at,
    starBeat,
    extraBeats,
  };

  return NextResponse.json({ ok: true, data } satisfies MobileApiResponse<MobilePublicProfile>);
}

