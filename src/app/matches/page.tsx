import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { setDiscoverAction } from "@/app/explore/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { profileInitials } from "@/lib/match-ui";
import { roleLabel } from "@/lib/role-label";

export const metadata: Metadata = {
  title: "Messages",
};

function formatPreview(body: string, mine: boolean): string {
  const b = body.trim();
  if (!b) return "Say hi…";
  const short = b.length > 72 ? `${b.slice(0, 72)}…` : b;
  return mine ? `You: ${short}` : short;
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/?error=supabase");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/matches");

  const params = await searchParams;
  const notice = params.notice ? decodeURIComponent(params.notice) : null;

  const { data: outgoing } = await supabase
    .from("discover_swipes")
    .select("target_id, created_at")
    .eq("viewer_id", user.id)
    .in("action", ["save", "interested"]);
  const { data: incoming } = await supabase
    .from("discover_swipes")
    .select("viewer_id, created_at")
    .eq("target_id", user.id)
    .in("action", ["save", "interested"]);

  const outgoingIds = new Set((outgoing ?? []).map((r) => r.target_id as string));
  const incomingIds = new Set((incoming ?? []).map((r) => r.viewer_id as string));
  const matchIds = [...outgoingIds].filter((id) => incomingIds.has(id));

  const outgoingAt = new Map(
    (outgoing ?? []).map((r) => [r.target_id as string, r.created_at as string]),
  );
  const incomingAt = new Map(
    (incoming ?? []).map((r) => [r.viewer_id as string, r.created_at as string]),
  );

  const mySentToMatches =
    matchIds.length > 0
      ? (
          await supabase
            .from("match_messages")
            .select("id, recipient_id, body, created_at, read_at")
            .eq("sender_id", user.id)
            .in("recipient_id", matchIds)
        ).data ?? []
      : [];
  const recvFromMatches =
    matchIds.length > 0
      ? (
          await supabase
            .from("match_messages")
            .select("id, sender_id, body, created_at, read_at")
            .eq("recipient_id", user.id)
            .in("sender_id", matchIds)
        ).data ?? []
      : [];

  const byMatchMessage = new Map<
    string,
    { body: string; createdAt: string; mine: boolean; unreadIncoming: number }
  >();
  for (const id of matchIds) {
    const sent = mySentToMatches.filter((m) => m.recipient_id === id);
    const recv = recvFromMatches.filter((m) => m.sender_id === id);
    const unreadIncoming = recv.filter((m) => m.read_at === null).length;
    const combined = [
      ...sent.map((m) => ({ ...m, mine: true as const })),
      ...recv.map((m) => ({ ...m, mine: false as const })),
    ];
    if (combined.length === 0) continue;
    combined.sort(
      (a, b) =>
        new Date(a.created_at as string).getTime() -
        new Date(b.created_at as string).getTime(),
    );
    const latest = combined[combined.length - 1]!;
    byMatchMessage.set(id, {
      body: latest.body as string,
      createdAt: latest.created_at as string,
      mine: latest.mine,
      unreadIncoming,
    });
  }

  const mutualAt = (id: string) => {
    const out = outgoingAt.get(id) ?? "";
    const inc = incomingAt.get(id) ?? "";
    return out > inc ? out : inc;
  };

  const orderedMatchIds = [...matchIds].sort((a, b) => {
    const ma = byMatchMessage.get(a);
    const mb = byMatchMessage.get(b);
    const aTs = ma?.createdAt ?? mutualAt(a);
    const bTs = mb?.createdAt ?? mutualAt(b);
    return bTs.localeCompare(aTs);
  });

  if (!matchIds.length) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Messages</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
          When you and someone both like each other, you can chat here — same idea as Tinder or
          Hinge.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/likes"
            className="inline-flex rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            See likes
          </Link>
          <Link
            href="/explore"
            className="inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
          >
            Discover
          </Link>
        </div>
      </main>
    );
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, role, city, niche")
    .in("id", matchIds);
  type MiniProfile = {
    id: string;
    display_name: string | null;
    role: string | null;
    city: string | null;
    niche: string | null;
  };
  const byId = new Map(
    (profiles as MiniProfile[] | null | undefined ?? []).map((p) => [p.id, p]),
  );

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-12 pt-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Messages</h1>
        <p className="mt-1 text-sm text-zinc-500">Chats with your mutual matches.</p>
      </div>
      {notice ? (
        <p className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {notice}
        </p>
      ) : null}
      <ul className="space-y-2">
        {orderedMatchIds.map((id) => {
          const p = byId.get(id);
          const name = p?.display_name?.trim() || "Member";
          const initials = profileInitials(p?.display_name ?? null);
          const chat = byMatchMessage.get(id);
          const unread = chat?.unreadIncoming ?? 0;
          const isNewMatch = !chat;
          const yourTurn = Boolean(chat && !chat.mine && unread > 0);
          const meta = [
            roleLabel(p?.role ?? null),
            p?.city?.trim(),
            p?.niche?.trim(),
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li key={id}>
              <article className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-lg shadow-black/20">
                <Link
                  href={`/matches/${id}`}
                  className="flex gap-3 p-4 transition hover:bg-white/[0.04]"
                >
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/35 to-amber-700/25 text-sm font-semibold text-amber-50 ring-2 ring-amber-500/20"
                    aria-hidden
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-zinc-50">{name}</span>
                        {meta ? (
                          <p className="mt-0.5 truncate text-xs text-zinc-500">{meta}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {isNewMatch ? (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                            New
                          </span>
                        ) : null}
                        {unread > 0 ? (
                          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-zinc-950">
                            {unread > 9 ? "9+" : unread}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                      {chat
                        ? formatPreview(chat.body, chat.mine)
                        : "You matched — tap to say hello."}
                    </p>
                    {yourTurn ? (
                      <p className="mt-1.5 text-xs font-medium text-amber-400/95">Your turn</p>
                    ) : null}
                  </div>
                </Link>
                <div className="flex items-center justify-between border-t border-white/5 px-4 py-2">
                  <Link
                    href={`/p/${id}`}
                    className="text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
                  >
                    View profile
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await setDiscoverAction(id, "pass", "/matches");
                      redirect("/matches?notice=Unmatched");
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs font-medium text-zinc-500 transition hover:text-red-300/90"
                    >
                      Unmatch
                    </button>
                  </form>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
