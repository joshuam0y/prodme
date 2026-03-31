import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { markAllNotificationsRead } from "@/lib/notifications";

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

  let notifications: NotificationRow[] = [];
  try {
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, title, body, href, created_at, read_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    notifications = (data as NotificationRow[] | null) ?? [];
    await markAllNotificationsRead(user.id);
  } catch {
    notifications = [];
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Alerts</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Matches, messages, and activity nudges show up here.
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          No alerts yet. When someone messages you, matches with you, or interacts with your profile,
          it will show up here.
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => {
            const content = (
              <div
                className={`block rounded-2xl border px-4 py-3 transition ${
                  n.read_at
                    ? "border-white/10 bg-zinc-900/40 hover:bg-white/[0.03]"
                    : "border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/15"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{n.title}</p>
                    {n.body ? <p className="mt-1 text-sm text-zinc-400">{n.body}</p> : null}
                    <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500">{n.kind}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {new Date(n.created_at).toLocaleDateString()}{" "}
                    {new Date(n.created_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.href ? <Link href={n.href}>{content}</Link> : content}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
