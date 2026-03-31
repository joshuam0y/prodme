import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type EventPayload = {
  event: string;
  path?: string;
  metadata?: Record<string, unknown>;
};

export async function trackServerEvent({
  event,
  path,
  metadata,
}: EventPayload): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("product_events").insert({
      user_id: user?.id ?? null,
      event_name: event,
      path: path ?? null,
      metadata: metadata ?? {},
    });
  } catch {
    // Best-effort analytics; never block product flows.
  }
}
