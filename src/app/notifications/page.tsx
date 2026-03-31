import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { markAllNotificationsRead } from "@/lib/notifications";
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
      .select("id, kind, title, body, href, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    notifications = (data as NotificationRow[] | null) ?? [];
  } catch {
    notifications = [];
  }
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
        <NotificationsList notifications={notifications} />
      )}
    </main>
  );
}
