"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
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
