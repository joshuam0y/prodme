import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type CreateNotificationInput = {
  userId: string;
  actorId?: string | null;
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    await supabase.from("notifications").insert({
      user_id: input.userId,
      actor_id: input.actorId ?? null,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Best-effort only.
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
  } catch {
    // Best-effort only.
  }
}
