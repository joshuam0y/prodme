"use server";

import { createClient } from "@/lib/supabase/server";

/** Skip DB write if we pinged recently (reduces load; still feels fresh in UI). */
const MIN_MS_BETWEEN_WRITES = 2 * 60 * 1000;

/**
 * Records that the signed-in user had the app open. Throttled server-side.
 * Safe to call often from the client (e.g. on load + interval).
 */
export async function touchLastSeen(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: row } = await supabase
    .from("profiles")
    .select("last_seen_at")
    .eq("id", user.id)
    .maybeSingle();

  const raw = row?.last_seen_at;
  const prev = typeof raw === "string" ? new Date(raw).getTime() : 0;
  if (prev > 0 && Date.now() - prev < MIN_MS_BETWEEN_WRITES) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  return { ok: !error };
}
