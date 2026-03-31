import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { formatNotificationDisplay, markAllNotificationsRead } from "@/lib/notifications";
import { NotificationsList } from "@/components/notifications-list";

export const metadata: Metadata = {
  title: "Alerts",
};

type NotificationRow = {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  actor_id: string | null;
  actor_avatar_url?: string | null;
  created_at: string;
  read_at: string | null;
};

export default async function NotificationsPage() {
  if (!isSupabaseConfigured()) redirect("/?error=supabase");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/notifications");
  const userId = user.id;

  async function markAllAction() {
    "use server";
    await markAllNotificationsRead(userId);
    redirect("/notifications");
  }

  let notifications: NotificationRow[] = [];
  try {
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, title, body, href, actor_id, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    notifications = (data as NotificationRow[] | null) ?? [];
  } catch {
    notifications = [];
  }

  const actorIds = [...new Set(notifications.map((n) => n.actor_id).filter((id): id is string => Boolean(id)))];
  let actorsById = new Map<string, { name: string; avatarUrl: string | null }>();
  if (actorIds.length > 0) {
    try {
      const { data: actors } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", actorIds);
      actorsById = new Map(
        (
          (actors as Array<{ id: string; display_name: string | null; avatar_url: string | null }> | null) ??
          []
        ).map((actor) => [
          actor.id,
          {
            name: actor.display_name?.trim() || "Someone",
            avatarUrl: actor.avatar_url?.trim() || null,
          },
        ]),
      );
    } catch {
      actorsById = new Map();
    }
  }

  const displayNotifications = notifications.map((notification) => {
    const actor = notification.actor_id ? actorsById.get(notification.actor_id) : null;
    const display = formatNotificationDisplay({
      kind: notification.kind,
      title: notification.title,
      body: notification.body,
      actorName: actor?.name ?? null,
    });
    return {
      ...notification,
      actor_avatar_url: actor?.avatarUrl ?? null,
      title: display.title,
      body: display.body,
    };
  });
  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Alerts</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Matches, messages, and activity nudges show up here.
          </p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllAction}>
            <button
              type="submit"
              className="rounded-full border border-white/15 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
            >
              Mark all read
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          No alerts yet. When someone messages you, matches with you, or interacts with your profile,
          it will show up here.
        </div>
      ) : (
        <NotificationsList notifications={displayNotifications} />
      )}
    </main>
  );
}
