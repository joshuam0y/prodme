import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { mapDbProfileToMobilePublic } from "@/lib/mobile-public-profile";
import type { MobileApiResponse, MobilePublicProfile } from "@/lib/mobile-api/types";
import type { DbProfile } from "@/lib/types";

export async function GET(req: Request) {
  void req;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "supabase_not_configured" } satisfies MobileApiResponse<never>, {
      status: 500,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "not_signed_in" } satisfies MobileApiResponse<never>, {
      status: 401,
    });
  }

  const { data: row, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, role, niche, goal, city, neighborhood, looking_for, prompt_1_question, prompt_1_answer, prompt_2_question, prompt_2_answer, onboarding_completed_at, star_beat_title, star_beat_audio_url, star_beat_cover_url, extra_beats, public_visibility, social_links",
    )
    .eq("id", user.id)
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

