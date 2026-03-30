"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/uuid";

export type DiscoverAction = "pass" | "save" | "interested";

export async function recordDiscoverAction(
  targetId: string,
  action: DiscoverAction,
): Promise<{ ok: boolean }> {
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

  return { ok: true };
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

  revalidatePath(pathToRevalidate);
  return { ok: true };
}
