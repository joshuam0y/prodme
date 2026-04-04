import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/uuid";
import { mapDbProfileToMobilePublic } from "@/lib/mobile-public-profile";
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
      "id, display_name, role, niche, goal, city, neighborhood, looking_for, prompt_1_question, prompt_1_answer, prompt_2_question, prompt_2_answer, onboarding_completed_at, star_beat_title, star_beat_audio_url, star_beat_cover_url, extra_beats, public_visibility, social_links",
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
  const data: MobilePublicProfile = mapDbProfileToMobilePublic(profile);

  return NextResponse.json({ ok: true, data } satisfies MobileApiResponse<MobilePublicProfile>);
}

