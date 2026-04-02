import Link from "next/link";
import { redirect } from "next/navigation";
import { setDiscoverAction } from "@/app/explore/actions";
import { ProfileAvatar } from "@/components/profile-avatar";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { roleLabel } from "@/lib/role-label";

export default async function LikesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/?error=supabase");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/likes");

  const params = await searchParams;
  const notice = params.notice ? decodeURIComponent(params.notice) : null;

  const {
    data: outgoing,
    error: outgoingError,
  } = await supabase
    .from("discover_swipes")
    .select("target_id, action, created_at")
    .eq("viewer_id", user.id)
    .in("action", ["save", "interested"]);
  const {
    data: incoming,
    error: incomingError,
  } = await supabase
    .from("discover_swipes")
    .select("viewer_id, action, created_at")
    .eq("target_id", user.id)
    .in("action", ["save", "interested"]);

  const outgoingIds = new Set((outgoing ?? []).map((r) => r.target_id as string));
  const incomingIds = new Set((incoming ?? []).map((r) => r.viewer_id as string));
  const matches = new Set<string>();
  for (const id of outgoingIds) if (incomingIds.has(id)) matches.add(id);

  const likesYouIds = [...incomingIds].filter((id) => !matches.has(id));
  const youLikedIds = [...outgoingIds].filter((id) => !matches.has(id));
  const matchIds = [...matches].sort((a, b) => a.localeCompare(b));
  const allIds = [...new Set([...likesYouIds, ...youLikedIds, ...matchIds])];

  type MiniProfile = {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    role: string | null;
    city: string | null;
    niche: string | null;
  };
  let byId = new Map<string, MiniProfile>();
  let profilesError: string | null = null;
  if (allIds.length) {
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, role, city, niche")
      .in("id", allIds);
    if (profErr) profilesError = profErr.message;
    byId = new Map((profiles as MiniProfile[] | null | undefined ?? []).map((p) => [p.id, p]));
  }

  const queryError =
    outgoingError?.message ??
    incomingError?.message ??
    profilesError ??
    null;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-12 pt-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Likes</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        See who liked you and who you liked back. Match to start chatting in{" "}
        <Link href="/matches" className="font-medium text-amber-400/90 underline-offset-2 hover:underline">
          Messages
        </Link>
        .
      </p>
      {notice ? (
        <p className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {notice}
        </p>
      ) : null}
      {queryError ? (
        <p className="mt-4 rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {queryError}
        </p>
      ) : null}

      {matchIds.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            Mutual matches
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            You liked each other — open a thread in{" "}
            <Link href="/matches" className="font-medium text-amber-400/90 underline-offset-2 hover:underline">
              Messages
            </Link>
            .
          </p>
          <ul className="mt-4 space-y-2">
            {matchIds.map((id) => {
              const p = byId.get(id);
              const name = p?.display_name?.trim() || "Member";
              return (
                <li key={`match-${id}`}>
                  <Link
                    href={`/matches/${id}`}
                    className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 transition hover:border-emerald-500/40 hover:bg-emerald-500/15"
                  >
                    <ProfileAvatar
                      name={name}
                      avatarUrl={p?.avatar_url}
                      sizeClassName="h-14 w-14"
                      textClassName="text-sm font-semibold text-emerald-50"
                      ringClassName="ring-2 ring-emerald-500/35 bg-gradient-to-br from-emerald-500/30 to-teal-600/20"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-zinc-50">{name}</span>
                      <p className="mt-1 text-xs text-emerald-100/80">
                        {p
                          ? `${roleLabel(p.role)}${p.city?.trim() ? ` · ${p.city.trim()}` : ""}`
                          : "Say hi while the match is fresh."}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-emerald-200">Open chat →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">
          Likes you
        </h2>
        {likesYouIds.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
            {matchIds.length > 0
              ? "No new likes to respond to — you already liked these people back. Use Mutual matches or Messages to chat."
              : "No one new yet. Keep swiping on Discover."}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {likesYouIds.map((id) => {
              const p = byId.get(id);
              const name = p?.display_name?.trim() || "Member";
              return (
                <li key={id}>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02]">
                    <div className="flex gap-3 p-4">
                      <ProfileAvatar
                        name={name}
                        avatarUrl={p?.avatar_url}
                        sizeClassName="h-14 w-14"
                        textClassName="text-sm font-semibold text-amber-50"
                        ringClassName="ring-2 ring-amber-500/25 bg-gradient-to-br from-amber-500/40 to-rose-500/20"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/p/${id}`}
                          className="font-semibold text-zinc-50 transition hover:text-amber-300"
                        >
                          {name}
                        </Link>
                        <p className="mt-1 text-xs text-zinc-500">
                          {p
                            ? `${roleLabel(p.role)}${p.city?.trim() ? ` · ${p.city.trim()}` : ""}${
                                p.niche?.trim() ? ` · ${p.niche.trim()}` : ""
                              }`
                            : "Profile hidden — you can still match or pass."}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 border-t border-white/5 px-4 py-3">
                      <form
                        className="flex-1"
                        action={async () => {
                          "use server";
                          await setDiscoverAction(id, "save", "/likes");
                          redirect("/matches?notice=It%27s%20a%20match");
                        }}
                      >
                        <button
                          type="submit"
                          className="w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-400 hover:to-amber-500"
                        >
                          Like back
                        </button>
                      </form>
                      <form
                        action={async () => {
                          "use server";
                          await setDiscoverAction(id, "pass", "/likes");
                          redirect("/likes?notice=Passed");
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
                        >
                          Pass
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          You liked
        </h2>
        {youLikedIds.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            {matchIds.length > 0
              ? "Everyone you’ve recently liked either matched with you (see Mutual matches) or hasn’t swiped yet."
              : "No outgoing likes yet."}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {youLikedIds.map((id) => {
              const p = byId.get(id);
              const name = p?.display_name?.trim() || "Member";
              return (
                <li key={id}>
                  <Link
                    href={`/p/${id}`}
                    className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 transition hover:border-white/15 hover:bg-white/[0.05]"
                  >
                    <ProfileAvatar
                      name={name}
                      avatarUrl={p?.avatar_url}
                      sizeClassName="h-11 w-11"
                      textClassName="text-xs font-semibold text-zinc-200"
                      ringClassName="bg-zinc-700/50"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-zinc-200">{name}</span>
                      <p className="text-xs text-zinc-500">
                        {p ? "We’ll notify you if they like you back." : "Like is saved."}
                      </p>
                    </div>
                    <span className="text-zinc-600" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
