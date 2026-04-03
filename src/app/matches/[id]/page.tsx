import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MatchThreadClient } from "@/components/match-thread-client";
import { ProfileAvatar } from "@/components/profile-avatar";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { computePeerLastActivityMs, getPeerActivityDisplay } from "@/lib/format-date";
import { isUuid } from "@/lib/uuid";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; draft?: string }>;
};

export default async function MatchConversationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isSupabaseConfigured() || !isUuid(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/matches/${id}`)}`);

  const { data: mySwipe } = await supabase
    .from("discover_swipes")
    .select("action")
    .eq("viewer_id", user.id)
    .eq("target_id", id)
    .in("action", ["save", "interested"])
    .maybeSingle();
  const { data: theirSwipe } = await supabase
    .from("discover_swipes")
    .select("action")
    .eq("viewer_id", id)
    .eq("target_id", user.id)
    .in("action", ["save", "interested"])
    .maybeSingle();
  if (!mySwipe || !theirSwipe) {
    redirect("/matches?notice=You%20can%20only%20chat%20with%20matches");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role, city, niche, looking_for, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  const { data: rows } = await supabase
    .from("match_messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(250);

  await supabase
    .from("match_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", id)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  const name = profile.display_name?.trim() || "Match";
  const threadForActivity = (rows ?? []).map((m) => ({
    sender_id: m.sender_id as string,
    recipient_id: m.recipient_id as string,
    created_at: m.created_at as string,
    read_at: (m.read_at as string | null) ?? null,
  }));
  const peerActivityMs = computePeerLastActivityMs({
    profileUpdatedAtIso: profile.updated_at ?? null,
    messages: threadForActivity,
    peerId: id,
    selfId: user.id,
  });
  const peerActivity =
    peerActivityMs > 0 ? getPeerActivityDisplay(new Date(peerActivityMs).toISOString()) : { text: "", recent: false };
  const notice = sp.notice ? decodeURIComponent(sp.notice) : null;
  const draft = sp.draft ? decodeURIComponent(sp.draft) : null;
  let blockedNotice: string | null = null;
  try {
    const { data: blocks } = await supabase
      .from("profile_blocks")
      .select("blocker_id, blocked_id")
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${id}),and(blocker_id.eq.${id},blocked_id.eq.${user.id})`,
      )
      .limit(1);
    if (blocks && blocks.length > 0) {
      blockedNotice = "Messaging is unavailable because one of you has blocked the other.";
    }
  } catch {
    blockedNotice = null;
  }
  const list = (rows ?? []).map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    recipient_id: m.recipient_id,
    body: m.body,
    created_at: m.created_at,
    read_at: m.read_at,
  }));

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/matches"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
            aria-label="Back to messages"
          >
            ←
          </Link>
          <Link
            href={`/p/${id}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 transition hover:bg-white/[0.04]"
          >
            <ProfileAvatar
              name={name}
              avatarUrl={profile.avatar_url}
              sizeClassName="h-10 w-10"
              textClassName="text-xs font-semibold text-amber-50"
              ringClassName="bg-gradient-to-br from-amber-500/35 to-amber-700/25"
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-zinc-50">{name}</h1>
              <p className="truncate text-xs text-zinc-500">
                {[profile.role?.trim(), profile.city?.trim(), profile.niche?.trim()].filter(Boolean).join(" · ") || "Tap for full profile"}
              </p>
              {peerActivity.text ? (
                <p
                  className={`truncate text-[11px] ${
                    peerActivity.recent ? "text-emerald-400/85" : "text-zinc-500"
                  }`}
                >
                  {peerActivity.text}
                </p>
              ) : null}
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-4 pt-2 sm:px-6">
        {notice ? (
          <p className="mb-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {notice}
          </p>
        ) : null}
        {blockedNotice ? (
          <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {blockedNotice}
          </p>
        ) : null}
        <MatchThreadClient
          matchId={id}
          currentUserId={user.id}
          matchName={name}
          matchRole={profile.role}
          matchContext={{
            city: profile.city ?? null,
            niche: profile.niche ?? null,
            lookingFor: profile.looking_for ?? null,
          }}
          initialMessages={list}
          initialDraft={draft}
        />
      </main>
    </div>
  );
}
