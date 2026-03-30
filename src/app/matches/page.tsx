import Link from "next/link";
import { redirect } from "next/navigation";
import { setDiscoverAction } from "@/app/explore/actions";
import {
  saveLeadOutreachDraft,
  setLeadOutreachStatus,
  type LeadOutreachStatus,
} from "@/app/leads/actions";
import { LeadMessageTools } from "@/components/lead-message-tools";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function roleLabel(raw: string | null): string {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("producer")) return "Producer";
  if (s.includes("dj")) return "DJ";
  if (s.includes("venue") || s.includes("promoter")) return "Venue";
  if (s.includes("artist")) return "Artist";
  return "Artist";
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Matches</h1>
        <p className="mt-3 text-sm text-zinc-500">
          When both of you like each other, matches land here.
        </p>
        <Link
          href="/likes"
          className="mt-8 inline-flex rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
        >
          Go to Likes
        </Link>
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

  let outreachByTarget = new Map<
    string,
    { status: LeadOutreachStatus; messageDraft: string | null; lastContactedAt: string | null }
  >();
  try {
    const { data: outreachRows } = await supabase
      .from("lead_outreach")
      .select("target_id, status, message_draft, last_contacted_at")
      .eq("viewer_id", user.id)
      .in("target_id", matchIds);
    outreachByTarget = new Map(
      (outreachRows ?? []).map((r) => [
        r.target_id as string,
        {
          status: (r.status as LeadOutreachStatus) ?? "draft",
          messageDraft: (r.message_draft as string | null) ?? null,
          lastContactedAt: (r.last_contacted_at as string | null) ?? null,
        },
      ]),
    );
  } catch {
    outreachByTarget = new Map();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Matches</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Mutual likes. Start the conversation in-app style.
      </p>
      {notice ? (
        <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-100">
          {notice}
        </p>
      ) : null}
      <ul className="mt-8 space-y-3">
        {orderedMatchIds.map((id) => {
          const p = byId.get(id);
          const name = p?.display_name?.trim() || "Member";
          const outreach = outreachByTarget.get(id);
          const outreachStatus = outreach?.status ?? "draft";
          const chat = byMatchMessage.get(id);
          const unread = chat?.unreadIncoming ?? 0;
          const isNewMatch = !chat;
          const yourTurn = Boolean(chat && !chat.mine && unread > 0);
          return (
            <li key={id} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/p/${id}`} className="font-medium text-zinc-100 hover:text-amber-300">
                  {name}
                </Link>
                <div className="flex items-center gap-2">
                  {isNewMatch ? (
                    <span className="rounded-full border border-amber-500/45 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-200">
                      New
                    </span>
                  ) : null}
                  {unread > 0 ? (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-200">
                      {unread} unread
                    </span>
                  ) : null}
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-200">
                    Match
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {roleLabel(p?.role ?? null)}
                {p?.city?.trim() ? ` · ${p.city.trim()}` : ""}
                {p?.niche?.trim() ? ` · ${p.niche.trim()}` : ""}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {chat?.body
                  ? `${chat.mine ? "You: " : ""}${chat.body.slice(0, 90)}`
                  : "You matched — send a first message."}
              </p>
              {yourTurn ? (
                <p className="mt-1 text-[11px] font-medium text-amber-300">Your turn</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/matches/${id}`}
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  Open chat
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await setDiscoverAction(id, "interested", "/matches");
                    redirect("/matches?notice=Moved%20to%20Interested");
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20"
                  >
                    Move to Interested
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await setDiscoverAction(id, "pass", "/matches");
                    redirect("/matches?notice=Unmatched");
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
                  >
                    Unmatch
                  </button>
                </form>
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-zinc-950/30 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Start conversation
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["draft", "sent", "follow_up"] as const).map((s) => (
                    <form
                      key={s}
                      action={async () => {
                        "use server";
                        await setLeadOutreachStatus(id, s, "/matches");
                        redirect("/matches?notice=Outreach%20updated");
                      }}
                    >
                      <button
                        type="submit"
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          outreachStatus === s
                            ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/35"
                            : "border border-white/15 text-zinc-300 hover:bg-white/5"
                        }`}
                      >
                        {s === "follow_up" ? "Follow-up" : s[0].toUpperCase() + s.slice(1)}
                      </button>
                    </form>
                  ))}
                </div>
                {outreach?.lastContactedAt ? (
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Last contacted {new Date(outreach.lastContactedAt).toLocaleString()}
                  </p>
                ) : null}
                <form
                  className="mt-3"
                  action={async (formData) => {
                    "use server";
                    const draft = String(formData.get("draft") ?? "");
                    await saveLeadOutreachDraft(id, draft, "/matches");
                    redirect("/matches?notice=Draft%20saved");
                  }}
                >
                  <LeadMessageTools
                    displayName={name}
                    roleLabel={roleLabel(p?.role ?? null)}
                    context="interested"
                    defaultDraft={outreach?.messageDraft ?? ""}
                    textareaName="draft"
                  />
                  <button
                    type="submit"
                    className="mt-2 rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
                  >
                    Save draft
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
