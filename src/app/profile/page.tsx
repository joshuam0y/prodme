import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDisplayDate } from "@/lib/format-date";
import { isProfileQuestionnaireComplete } from "@/lib/profile-completion";
import { parseExtraBeats } from "@/lib/profile-beats";
import type { DbProfile } from "@/lib/types";
import { trackServerEvent } from "@/lib/analytics";
import { ProfileBasicsForm } from "./profile-basics-form";
import { ProfileBeatsForm } from "./profile-beats-form";
import { ProfileLocationForm } from "./profile-location-form";
import { ProfileVenuePhotosForm } from "./profile-venue-photos-form";
import { StarRatingDisplay } from "@/components/star-rating-display";

export default async function ProfilePage() {
  if (!isSupabaseConfigured()) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const { data: row, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, role, niche, goal, city, neighborhood, latitude, longitude, location_radius_km, verified, looking_for, prompt_1_question, prompt_1_answer, prompt_2_question, prompt_2_answer, onboarding_completed_at, updated_at, star_beat_title, star_beat_audio_url, star_beat_cover_url, extra_beats",
    )
    .eq("id", user.id)
    .maybeSingle();

  // If optional preview columns (star/extra_beats) are missing in the DB yet,
  // the whole select can fail and we incorrectly show "Complete setup".
  // Fallback to the minimal fields needed for completion status.
  let profile = row as DbProfile | null;
  let showError = Boolean(error);
  if (error) {
    const { data: minimalRow, error: minimalErr } = await supabase
      .from("profiles")
      .select(
        "id, display_name, role, niche, goal, city, neighborhood, latitude, longitude, location_radius_km, verified, looking_for, prompt_1_question, prompt_1_answer, prompt_2_question, prompt_2_answer, onboarding_completed_at, updated_at",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (minimalErr || !minimalRow) {
      showError = true;
      profile = row as DbProfile | null;
    } else {
      showError = false;
      profile = minimalRow as DbProfile;
    }
  }

  const incomplete = !isProfileQuestionnaireComplete(profile);
  const roleLower = (profile?.role ?? "").toLowerCase();
  const isVenueProfile = roleLower.includes("venue") || roleLower.includes("promoter");

  let ratingAvg: number | null = null;
  let ratingCount = 0;
  let ratingsDisabled = false;
  let entitlementPlan = "free";
  let entitlementStatus = "active";
  try {
    const { data: ratingRows } = await supabase
      .from("profile_ratings")
      .select("rating")
      .eq("target_id", user.id);
    ratingCount = ratingRows?.length ?? 0;
    ratingAvg =
      ratingCount > 0
        ? ratingRows!.reduce((sum, r) => sum + r.rating, 0) / ratingCount
        : null;
  } catch {
    ratingAvg = null;
    ratingCount = 0;
    ratingsDisabled = true;
  }
  try {
    const { data: entitlement } = await supabase
      .from("billing_entitlements")
      .select("plan, status")
      .eq("user_id", user.id)
      .maybeSingle();
    entitlementPlan = entitlement?.plan ?? "free";
    entitlementStatus = entitlement?.status ?? "active";
  } catch {
    entitlementPlan = "free";
    entitlementStatus = "active";
  }
  await trackServerEvent({ event: "profile_opened", path: "/profile" });

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
        Your profile
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        What others will use to understand your style and goals.
      </p>

      {showError && error ? (
        <p className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error.message}
        </p>
      ) : null}

      <dl className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Name
          </dt>
          <dd className="mt-1 text-zinc-100">
            {profile?.display_name?.trim() || user.email?.split("@")[0] || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Role
          </dt>
          <dd className="mt-1 text-zinc-100">{profile?.role ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Style
          </dt>
          <dd className="mt-1 text-zinc-100">{profile?.niche ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Goal
          </dt>
          <dd className="mt-1 text-zinc-100">{profile?.goal ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Profile completed
          </dt>
          <dd className="mt-1 text-zinc-100">
            {formatDisplayDate(profile?.onboarding_completed_at)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Plan
          </dt>
          <dd className="mt-1 text-zinc-100">
            {entitlementPlan} · {entitlementStatus}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Community rating
          </dt>
          <dd className="mt-1 text-zinc-100">
            {ratingsDisabled ? (
              <span className="text-xs text-zinc-400">
                Ratings disabled for now.
              </span>
            ) : ratingAvg !== null ? (
              <StarRatingDisplay average={ratingAvg} count={ratingCount} />
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {incomplete ? (
          <Link
            href="/onboarding"
            className="inline-flex justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Complete setup
          </Link>
        ) : null}
        <Link
          href="/explore"
          className="inline-flex justify-center rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
        >
          Discover
        </Link>
        {!incomplete ? (
          <Link
            href={`/p/${user.id}`}
            className="inline-flex justify-center rounded-full border border-amber-500/35 bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-amber-400 transition hover:bg-amber-500/20"
          >
            View public profile
          </Link>
        ) : null}
        {!incomplete ? (
          <Link
            href="/onboarding"
            className="inline-flex justify-center rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
          >
            Re-take onboarding (optional)
          </Link>
        ) : null}
      </div>
      {!incomplete ? (
        <p className="mt-2 text-xs text-zinc-500">
          Quick edits below update only selected fields. Re-taking onboarding is optional.
        </p>
      ) : null}

      <ProfileBasicsForm
        initial={{
          displayName: profile?.display_name?.trim() ?? "",
          niche: profile?.niche?.trim() ?? "",
          goal: profile?.goal?.trim() ?? "",
          city: profile?.city?.trim() ?? "",
          lookingFor: profile?.looking_for?.trim() ?? "",
          prompt1Q: profile?.prompt_1_question?.trim() ?? "",
          prompt1A: profile?.prompt_1_answer?.trim() ?? "",
          prompt2Q: profile?.prompt_2_question?.trim() ?? "",
          prompt2A: profile?.prompt_2_answer?.trim() ?? "",
        }}
      />
      <ProfileLocationForm
        initial={{
          city: profile?.city?.trim() ?? "",
          neighborhood: profile?.neighborhood?.trim() ?? "",
          latitude: profile?.latitude ?? null,
          longitude: profile?.longitude ?? null,
          radiusKm: profile?.location_radius_km ?? 25,
        }}
      />

      {!incomplete ? (
        isVenueProfile ? (
          <ProfileVenuePhotosForm
            key={`${profile?.updated_at ?? ""}-${profile?.star_beat_cover_url ?? ""}`}
            initial={{
              starCoverUrl: profile?.star_beat_cover_url?.trim() ?? "",
              extras: parseExtraBeats(profile?.extra_beats),
            }}
          />
        ) : (
          <ProfileBeatsForm
            key={`${profile?.updated_at ?? ""}-${profile?.star_beat_audio_url ?? ""}`}
            initial={{
              starTitle: profile?.star_beat_title?.trim() ?? "",
              starAudioUrl: profile?.star_beat_audio_url?.trim() ?? "",
              starCoverUrl: profile?.star_beat_cover_url?.trim() ?? "",
              extras: parseExtraBeats(profile?.extra_beats),
            }}
          />
        )
      ) : (
        <p className="mt-10 rounded-xl border border-white/5 bg-zinc-950/30 px-4 py-3 text-center text-sm text-zinc-500">
          Finish onboarding to add discover previews (star track + extra beats).
        </p>
      )}
    </main>
  );
}
