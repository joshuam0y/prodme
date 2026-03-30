"use server";

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
    console.error("recordDiscoverAction", error.message);
    return { ok: false };
  }

  return { ok: true };
}
