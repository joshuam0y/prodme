import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getLiveProfileCards, inferProfileRole } from "@/lib/discover-profiles";
import { isSupabaseConfigured } from "@/lib/env";
import {
  formatNotificationDisplay,
  markAllNotificationsRead,
} from "@/lib/notifications";
import { NotificationsList } from "@/components/notifications-list";

export const metadata: Metadata = {
  title: "Notifications",
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
  const unreadMessageAlerts = notifications.filter(
    (n) => n.kind === "message_received" && n.read_at === null,
  ).length;
  const unreadMatchAlerts = notifications.filter(
    (n) => n.kind === "match_created" && n.read_at === null,
  ).length;
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role, niche, goal, looking_for, latitude, longitude")
    .eq("id", userId)
    .maybeSingle();
  const recommendedProfiles = await getLiveProfileCards(userId, userId, {
    viewerLat: viewerProfile?.latitude ?? null,
    viewerLng: viewerProfile?.longitude ?? null,
    viewerRole: viewerProfile?.role?.trim() ? inferProfileRole(viewerProfile.role) : null,
    viewerNiche: viewerProfile?.niche?.trim() ?? null,
    viewerGoal: viewerProfile?.goal?.trim() ?? null,
    viewerLookingFor: viewerProfile?.looking_for?.trim() ?? null,
    sort: "trending",
    maxDistanceKm: 50,
  });
  const smartRecommendations = recommendedProfiles
    .filter((profile) => typeof profile.semanticScore === "number" && (profile.semanticScore ?? 0) >= 0.72)
    .slice(0, 3);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Notifications</h1>
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

      {unreadMessageAlerts > 0 ? (
        <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-100">
            {unreadMessageAlerts === 1
              ? "A conversation is waiting on you."
              : `${unreadMessageAlerts} conversations are waiting on you.`}
          </p>
          <p className="mt-1 text-sm text-amber-100/80">
            Open Messages and reply while the thread is still warm.
          </p>
          <div className="mt-3">
            <Link
              href="/matches"
              className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
            >
              Open Messages
            </Link>
          </div>
        </div>
      ) : unreadMatchAlerts > 0 ? (
        <div className="mb-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-emerald-100">
            {unreadMatchAlerts === 1
              ? "You have a fresh match waiting."
              : `You have ${unreadMatchAlerts} fresh matches waiting.`}
          </p>
          <p className="mt-1 text-sm text-emerald-100/80">
            Send the first message before the momentum drops.
          </p>
          <div className="mt-3">
            <Link
              href="/matches"
              className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
            >
              Start chats
            </Link>
          </div>
        </div>
      ) : null}

      {smartRecommendations.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Recommended for you</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Strong profile matches picked from your AI and semantic signals.
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-500/30">
              AI
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {smartRecommendations.map((profile) => (
              <Link
                key={`alert-recommendation-${profile.id}`}
                href={`/p/${profile.id}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-100">{profile.displayName}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {profile.role} · {profile.city}
                  </p>
                  {profile.matchWhy?.[0] ? (
                    <p className="mt-2 text-sm text-zinc-300">{profile.matchWhy[0]}</p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                  {Math.round((profile.semanticScore ?? 0) * 100)}%
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          No notifications yet. When someone messages you, matches with you, or interacts with your profile,
          it will show up here.
        </div>
      ) : (
        <NotificationsList notifications={displayNotifications} />
      )}
    </main>
  );
}
