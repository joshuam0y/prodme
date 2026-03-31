"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { trackServerEvent } from "@/lib/analytics";
import { isUuid } from "@/lib/uuid";

export type DiscoverAction = "pass" | "save";

export async function recordDiscoverAction(
  targetId: string,
  action: DiscoverAction,
): Promise<{ ok: boolean; matched?: boolean }> {
  if (!isSupabaseConfigured() || !isUuid(targetId)) {
    return { ok: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: true };
  }
  if (user.id === targetId) {
    return { ok: false };
  }

  const { error } = await supabase.from("discover_swipes").upsert(
    {
      viewer_id: user.id,
      target_id: targetId,
      action,
    },
    { onConflict: "viewer_id,target_id" },
  );

  if (error) {
    console.error("recordDiscoverAction", error.message);
    return { ok: false };
  }

  await trackServerEvent({
    event: action === "save" ? "discover_saved_profile" : "discover_passed_profile",
    path: "/explore",
    metadata: { targetId },
  });

  if (action !== "save") return { ok: true };

  // Mutual match check: did they also "save" you?
  try {
    const { data: reciprocal } = await supabase
      .from("discover_swipes")
      .select("viewer_id")
      .eq("viewer_id", targetId)
      .eq("target_id", user.id)
      .in("action", ["save", "interested"])
      .maybeSingle();
    const matched = Boolean(reciprocal);
    if (matched) {
      await trackServerEvent({
        event: "match_created",
        path: "/explore",
        metadata: { targetId },
      });
    }
    return { ok: true, matched };
  } catch {
    return { ok: true };
  }
}

export async function setDiscoverAction(
  targetId: string,
  action: DiscoverAction,
  pathToRevalidate: string,
): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured() || !isUuid(targetId)) {
    return { ok: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id === targetId) {
    return { ok: false };
  }

  const { error } = await supabase.from("discover_swipes").upsert(
    {
      viewer_id: user.id,
      target_id: targetId,
      action,
    },
    { onConflict: "viewer_id,target_id" },
  );

  if (error) {
    console.error("setDiscoverAction", error.message);
    return { ok: false };
  }

  await trackServerEvent({
    event: action === "save" ? "likes_like_back" : "likes_pass",
    path: pathToRevalidate,
    metadata: { targetId },
  });

  if (action === "pass") {
    const { error: pipelineErr } = await supabase
      .from("interested_pipeline")
      .delete()
      .eq("viewer_id", user.id)
      .eq("target_id", targetId);
    if (pipelineErr) {
      /* optional table */
    }
    const { error: outreachErr } = await supabase
      .from("lead_outreach")
      .delete()
      .eq("viewer_id", user.id)
      .eq("target_id", targetId);
    if (outreachErr) {
      /* optional table */
    }
  }

  revalidatePath(pathToRevalidate);
  return { ok: true };
}

export async function removeDiscoverAction(
  targetId: string,
  pathToRevalidate: string,
): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured() || !isUuid(targetId)) {
    return { ok: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false };
  }

  const { error } = await supabase
    .from("discover_swipes")
    .delete()
    .eq("viewer_id", user.id)
    .eq("target_id", targetId);

  if (error) {
    console.error("removeDiscoverAction", error.message);
    return { ok: false };
  }

  const { error: pipelineErr } = await supabase
    .from("interested_pipeline")
    .delete()
    .eq("viewer_id", user.id)
    .eq("target_id", targetId);
  if (pipelineErr) {
    // Optional table in progressive rollouts.
  }

  const { error: outreachErr } = await supabase
    .from("lead_outreach")
    .delete()
    .eq("viewer_id", user.id)
    .eq("target_id", targetId);
  if (outreachErr) {
    // Optional table in progressive rollouts.
  }

  revalidatePath(pathToRevalidate);
  return { ok: true };
}

export async function resetDiscoverSwipes(
  pathToRevalidate: string,
): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured()) {
    return { ok: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false };
  }

  // "Start over" should replay only profiles you previously dismissed ("pass").
  // Profiles in Saved / Interested are intentionally kept out of Discover
  // until the user explicitly removes them.
  const { error } = await supabase
    .from("discover_swipes")
    .delete()
    .eq("viewer_id", user.id)
    .eq("action", "pass");

  if (error) {
    console.error("resetDiscoverSwipes", error.message);
    return { ok: false };
  }

  revalidatePath(pathToRevalidate);
  return { ok: true };
}
