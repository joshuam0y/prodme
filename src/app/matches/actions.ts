"use server";

import { revalidatePath } from "next/cache";
import { generateMatchOpeners } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { isAiProfileCoachConfigured, isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/uuid";

export async function sendMatchMessage(
  targetId: string,
  body: string,
  pathToRevalidate: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !isUuid(targetId)) {
    return { ok: false, error: "invalid_target" };
  }
  const text = body.trim();
  if (!text) return { ok: false, error: "empty" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_signed_in" };
  if (user.id === targetId) return { ok: false, error: "self" };

  // Require mutual like before messaging.
  const { data: mySwipe } = await supabase
    .from("discover_swipes")
    .select("action")
    .eq("viewer_id", user.id)
    .eq("target_id", targetId)
    .in("action", ["save", "interested"])
    .maybeSingle();
  const { data: theirSwipe } = await supabase
    .from("discover_swipes")
    .select("action")
    .eq("viewer_id", targetId)
    .eq("target_id", user.id)
    .in("action", ["save", "interested"])
    .maybeSingle();
  if (!mySwipe || !theirSwipe) {
    return { ok: false, error: "not_matched" };
  }

  const { error } = await supabase.from("match_messages").insert({
    sender_id: user.id,
    recipient_id: targetId,
    body: text.slice(0, 2000),
  });
  if (error) {
    console.error("sendMatchMessage", error.message);
    return { ok: false, error: "insert_failed" };
  }

  revalidatePath(pathToRevalidate);
  revalidatePath("/matches");
  return { ok: true };
}

export async function generateMatchOpenersAction(
  targetId: string,
): Promise<{ ok: true; openers: string[] } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !isUuid(targetId)) {
    return { ok: false, error: "invalid_target" };
  }
  if (!isAiProfileCoachConfigured()) {
    return { ok: false, error: "AI suggestions are not configured yet." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_signed_in" };
  if (user.id === targetId) return { ok: false, error: "self" };

  const { data: mySwipe } = await supabase
    .from("discover_swipes")
    .select("action")
    .eq("viewer_id", user.id)
    .eq("target_id", targetId)
    .in("action", ["save", "interested"])
    .maybeSingle();
  const { data: theirSwipe } = await supabase
    .from("discover_swipes")
    .select("action")
    .eq("viewer_id", targetId)
    .eq("target_id", user.id)
    .in("action", ["save", "interested"])
    .maybeSingle();
  if (!mySwipe || !theirSwipe) {
    return { ok: false, error: "not_matched" };
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, niche, goal, looking_for")
    .in("id", [user.id, targetId]);

  if (error) return { ok: false, error: error.message };

  const me = profiles?.find((profile) => profile.id === user.id);
  const them = profiles?.find((profile) => profile.id === targetId);
  if (!them) return { ok: false, error: "not_found" };

  try {
    const openers = await generateMatchOpeners({
      meName: me?.display_name?.trim() || user.email?.split("@")[0] || "Member",
      meRole: me?.role?.trim() || "",
      meNiche: me?.niche?.trim() || "",
      meGoal: me?.goal?.trim() || "",
      meLookingFor: me?.looking_for?.trim() || "",
      themName: them.display_name?.trim() || "there",
      themRole: them.role?.trim() || "",
      themNiche: them.niche?.trim() || "",
      themGoal: them.goal?.trim() || "",
      themLookingFor: them.looking_for?.trim() || "",
    });
    return { ok: true, openers };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not generate openers.",
    };
  }
}
