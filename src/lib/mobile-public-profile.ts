import { beatsFromProfileRow } from "@/lib/profile-beats";
import { inferProfileRole } from "@/lib/discover-profiles";
import { isPublicFieldVisible } from "@/lib/public-visibility";
import { parseSocialLinks } from "@/lib/social-links";
import type { MobilePublicProfile } from "@/lib/mobile-api/types";
import type { DbProfile } from "@/lib/types";

/** Maps a DB row to the mobile public profile payload, respecting `public_visibility`. */
export function mapDbProfileToMobilePublic(profile: DbProfile): MobilePublicProfile {
  const vis = profile.public_visibility;
  const role = inferProfileRole(profile.role ?? null);
  const { starBeat, extraBeats } = beatsFromProfileRow({
    id: profile.id,
    star_beat_title: profile.star_beat_title ?? null,
    star_beat_audio_url: profile.star_beat_audio_url ?? null,
    star_beat_cover_url: profile.star_beat_cover_url ?? null,
    extra_beats: profile.extra_beats,
  });

  const showLocation = isPublicFieldVisible("location", vis);
  const showGoal = isPublicFieldVisible("goal", vis);
  const showLooking = isPublicFieldVisible("looking_for", vis);
  const showPrompts = isPublicFieldVisible("prompts", vis);
  const showNiche = isPublicFieldVisible("niche", vis);
  const showBeats = isPublicFieldVisible("beats", vis);

  return {
    id: profile.id,
    displayName: profile.display_name?.trim() || "Member",
    role,
    city: showLocation ? profile.city?.trim() || null : null,
    neighborhood: showLocation ? profile.neighborhood?.trim() || null : null,
    niche: showNiche ? profile.niche?.trim() || null : null,
    goal: showGoal ? profile.goal?.trim() || null : null,
    lookingFor: showLooking ? profile.looking_for?.trim() || null : null,
    prompt1Question: showPrompts ? profile.prompt_1_question?.trim() || null : null,
    prompt1Answer: showPrompts ? profile.prompt_1_answer?.trim() || null : null,
    prompt2Question: showPrompts ? profile.prompt_2_question?.trim() || null : null,
    prompt2Answer: showPrompts ? profile.prompt_2_answer?.trim() || null : null,
    onboardingCompletedAt: profile.onboarding_completed_at,
    starBeat: showBeats ? starBeat : undefined,
    extraBeats: showBeats ? extraBeats : undefined,
    socialLinks: parseSocialLinks(profile.social_links),
  };
}
