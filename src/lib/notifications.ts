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

export type NotificationDisplayInput = {
  kind: string;
  title: string;
  body: string | null;
  actorName?: string | null;
};

export function formatNotificationDisplay(input: NotificationDisplayInput): {
  title: string;
  body: string | null;
} {
  const actorName = input.actorName?.trim() || "Someone";

  if (input.kind === "profile_saved") {
    return {
      title: `${actorName} liked you`,
      body: "Open Likes to see who is interested.",
    };
  }

  if (input.kind === "message_received") {
    return {
      title: `${actorName} sent you a message`,
      body: input.body,
    };
  }

  if (input.kind === "match_created") {
    return {
      title: `You matched with ${actorName}`,
      body: "Say hi and start the conversation.",
    };
  }

  return {
    title: input.title,
    body: input.body,
  };
}

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

export async function markNotificationRead(
  userId: string,
  notificationId: number,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", notificationId)
      .is("read_at", null);
  } catch {
    // Best-effort only.
  }
}
