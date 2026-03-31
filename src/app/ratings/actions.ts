"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/uuid";

function isProfileRatingsMissing(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("profile_ratings") &&
    (m.includes("schema cache") ||
      m.includes("does not exist") ||
      m.includes("relation") ||
      m.includes("undefined")) // defensive across supabase versions
  );
}

export async function setProfileRating(
  targetId: string,
  rating: number,
): Promise<{ ok: boolean; error?: string; rating?: number }> {
  try {
    if (!isSupabaseConfigured() || !isUuid(targetId)) {
      return { ok: false, error: "Not configured." };
    }

    const safeRating = Number.isFinite(rating)
      ? Math.min(5, Math.max(1, Math.round(rating)))
      : NaN;

    if (!Number.isFinite(safeRating)) {
      return { ok: false, error: "Invalid rating." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Sign in required." };
    }

    if (user.id === targetId) {
      return { ok: false, error: "You can't rate yourself." };
    }

    // Only allow rating after the user saved (starred) this profile on Discover.
    // If they already have a rating row, allow updates (even if they later undo the swipe).
    const { data: existingRating } = await supabase
      .from("profile_ratings")
      .select("rating")
      .eq("viewer_id", user.id)
      .eq("target_id", targetId)
      .maybeSingle();

    if (!existingRating) {
      const { data: swipeRow, error: swipeErr } = await supabase
        .from("discover_swipes")
        .select("action")
        .eq("viewer_id", user.id)
        .eq("target_id", targetId)
        .in("action", ["save", "interested"])
        .maybeSingle();

      if (swipeErr) {
        console.error("setProfileRating swipe check", swipeErr.message);
        return { ok: false, error: "Could not validate event completion." };
      }

      if (!swipeRow) {
        return {
          ok: false,
          error:
            "You can only rate profiles after you like or save them from Discover.",
        };
      }
    }

    const { error } = await supabase.from("profile_ratings").upsert(
      {
        viewer_id: user.id,
        target_id: targetId,
        rating: safeRating,
      },
      { onConflict: "viewer_id,target_id" },
    );

    if (error) {
      if (isProfileRatingsMissing(error.message)) {
        return {
          ok: false,
          error:
            "Ratings are disabled for now. Run the latest Supabase migration (006_profile_ratings.sql).",
        };
      }
      console.error("setProfileRating", error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true, rating: safeRating };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (isProfileRatingsMissing(msg)) {
      return {
        ok: false,
        error:
          "Ratings are disabled for now. Run the latest Supabase migration (006_profile_ratings.sql).",
      };
    }
    console.error("setProfileRating caught", msg);
    return { ok: false, error: msg };
  }
}

