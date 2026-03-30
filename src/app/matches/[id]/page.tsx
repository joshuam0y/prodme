import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sendMatchMessage } from "@/app/matches/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/uuid";
import { profileInitials } from "@/lib/match-ui";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
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
    .select("id, display_name, role")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  await supabase
    .from("match_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", id)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  const { data: rows } = await supabase
    .from("match_messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(250);

  const name = profile.display_name?.trim() || "Match";
  const initials = profileInitials(profile.display_name);
  const notice = sp.notice ? decodeURIComponent(sp.notice) : null;
  const error = sp.error ? decodeURIComponent(sp.error) : null;

  const list = rows ?? [];

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <header className="sticky top-14 z-10 border-b border-white/10 bg-[var(--surface)]/90 backdrop-blur-md">
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
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/35 to-amber-700/25 text-xs font-semibold text-amber-50"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-zinc-50">{name}</h1>
              <p className="truncate text-xs text-zinc-500">Tap for full profile</p>
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
        {error ? (
          <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-zinc-950/50">
          <ul className="flex max-h-[min(52vh,420px)] flex-col gap-1 overflow-y-auto p-3 sm:max-h-[min(56vh,480px)]">
            {list.length === 0 ? (
              <li className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
                <p className="text-sm font-medium text-zinc-400">Say hello first</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Matches work best with a short, friendly opener.
                </p>
              </li>
            ) : (
              list.map((m, i) => {
                const mine = m.sender_id === user.id;
                const next = list[i + 1];
                const showSeen =
                  mine &&
                  (!next || next.sender_id !== user.id) &&
                  m.read_at !== null;
                return (
                  <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        mine
                          ? "rounded-br-md bg-gradient-to-br from-amber-500/25 to-amber-600/15 text-amber-50 ring-1 ring-amber-500/30"
                          : "rounded-bl-md bg-white/[0.06] text-zinc-100 ring-1 ring-white/10"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      {showSeen ? (
                        <p className="mt-1 text-right text-[10px] font-medium text-emerald-400/80">
                          Seen
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <form
          className="mt-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-2 shadow-inner shadow-black/20"
          action={async (formData) => {
            "use server";
            const body = String(formData.get("body") ?? "");
            const res = await sendMatchMessage(id, body, `/matches/${id}`);
            if (!res.ok) {
              redirect(
                `/matches/${id}?error=${encodeURIComponent(
                  res.error === "not_matched"
                    ? "You can only message mutual matches."
                    : "Could not send message.",
                )}`,
              );
            }
            redirect(`/matches/${id}`);
          }}
        >
          <label htmlFor="chat-body" className="sr-only">
            Message {name}
          </label>
          <textarea
            id="chat-body"
            name="body"
            rows={2}
            className="w-full resize-none rounded-xl border-0 bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
            placeholder={`Message ${name}…`}
          />
          <div className="flex justify-end border-t border-white/5 px-2 pb-1 pt-2">
            <button
              type="submit"
              className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
