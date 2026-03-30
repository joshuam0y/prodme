import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sendMatchMessage } from "@/app/matches/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/uuid";

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

  // Opening the thread marks incoming messages as read.
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
  const notice = sp.notice ? decodeURIComponent(sp.notice) : null;
  const error = sp.error ? decodeURIComponent(sp.error) : null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Match chat</p>
          <h1 className="text-xl font-semibold text-zinc-50">{name}</h1>
        </div>
        <Link
          href="/matches"
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
        >
          Back to matches
        </Link>
      </div>

      {notice ? (
        <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-3">
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto p-1">
          {(rows ?? []).length === 0 ? (
            <li className="px-2 py-8 text-center text-sm text-zinc-500">
              No messages yet. Send the first one.
            </li>
          ) : (
            (rows ?? []).map((m, i) => {
              const mine = m.sender_id === user.id;
              const next = (rows ?? [])[i + 1];
              const showSeen =
                mine &&
                (!next || next.sender_id !== user.id) &&
                m.read_at !== null;
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/35"
                        : "bg-white/5 text-zinc-200 ring-1 ring-white/10"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                    {showSeen ? (
                      <p className="mt-0.5 text-[10px] text-emerald-300/80">Seen</p>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <form
        className="mt-4 rounded-xl border border-white/10 bg-zinc-950/40 p-3"
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
          redirect(`/matches/${id}?notice=${encodeURIComponent("Message sent")}`);
        }}
      >
        <textarea
          name="body"
          rows={3}
          className="w-full rounded-md border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-amber-500/60"
          placeholder={`Message ${name}...`}
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            Send
          </button>
        </div>
      </form>
    </main>
  );
}
