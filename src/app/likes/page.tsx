import Link from "next/link";
import { redirect } from "next/navigation";
import { setDiscoverAction } from "@/app/explore/actions";
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
  const allIds = [...new Set([...likesYouIds, ...youLikedIds])];

  type MiniProfile = {
    id: string;
    display_name: string | null;
    role: string | null;
    city: string | null;
    niche: string | null;
  };
  let byId = new Map<string, MiniProfile>();
  let profilesError: string | null = null;
  if (allIds.length) {
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, display_name, role, city, niche")
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Likes</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Hinge-style flow: see who liked you, who you liked, and convert mutuals into matches.
      </p>
      {notice ? (
        <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-100">
          {notice}
        </p>
      ) : null}
      {queryError ? (
        <p className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
          {queryError}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-wider text-amber-500/90">Likes you</h2>
        {likesYouIds.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No incoming likes yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {likesYouIds.map((id) => {
              const p = byId.get(id);
              const name = p?.display_name?.trim() || "Member";
              return (
                <li key={id} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <Link href={`/p/${id}`} className="font-medium text-zinc-100 hover:text-amber-300">
                    {name}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    {p
                      ? `${roleLabel(p.role)}${p.city?.trim() ? ` · ${p.city.trim()}` : ""}${
                          p.niche?.trim() ? ` · ${p.niche.trim()}` : ""
                        }`
                      : "Profile unavailable — you can still like back or pass."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form
                      action={async () => {
                        "use server";
                        await setDiscoverAction(id, "save", "/likes");
                        redirect("/matches?notice=You%20matched");
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
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
                        className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
                      >
                        Pass
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">You liked</h2>
        {youLikedIds.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No outgoing likes yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {youLikedIds.map((id) => {
              const p = byId.get(id);
              const name = p?.display_name?.trim() || "Member";
              return (
                <li key={id} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <Link href={`/p/${id}`} className="font-medium text-zinc-100 hover:text-amber-300">
                    {name}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    {p ? "Waiting for mutual like." : "Profile unavailable — your like is still recorded."}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
