import Link from "next/link";
import { redirect } from "next/navigation";
import { removeDiscoverAction, setDiscoverAction } from "@/app/explore/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { ProfileRatingEditor } from "@/components/profile-rating-editor";
import { profileInitials } from "@/lib/match-ui";
import { roleLabel } from "@/lib/role-label";

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    undoTarget?: string;
    undoAction?: "save" | "interested";
  }>;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/?error=supabase");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/saved");
  }
  const params = await searchParams;
  const notice = params.notice ? decodeURIComponent(params.notice) : null;
  const undoTarget = params.undoTarget ?? null;
  const undoAction = params.undoAction ?? null;

  const { data: rows, error: swipeError } = await supabase
    .from("discover_swipes")
    .select("target_id, created_at")
    .eq("viewer_id", user.id)
    .eq("action", "save")
    .order("created_at", { ascending: false });

  if (swipeError) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Couldn&apos;t load saved profiles. Run the latest Supabase migrations
          (including <code className="text-red-100">004_discover_swipes</code>)
          and try again.
        </p>
      </main>
    );
  }

  const orderedIds = rows?.map((r) => r.target_id) ?? [];
  if (!orderedIds.length) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Saved</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
          Tap the star on Discover to bookmark profiles here. If you both like each other, you&apos;ll
          match and can chat in Messages.
        </p>
        <Link
          href="/explore"
          className="mt-8 inline-flex w-fit rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
        >
          Go to Discover
        </Link>
      </main>
    );
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, role, niche, city, onboarding_completed_at")
    .in("id", orderedIds);

  if (profileError || !profiles?.length) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
        <p className="text-sm text-zinc-500">Nothing to show right now.</p>
      </main>
    );
  }

  let ratingByTargetId = new Map<string, number>();
  try {
    const { data: myRatings } = await supabase
      .from("profile_ratings")
      .select("target_id, rating")
      .eq("viewer_id", user.id)
      .in("target_id", orderedIds);

    ratingByTargetId = new Map(
      (myRatings ?? []).map((r) => [r.target_id as string, r.rating as number]),
    );
  } catch {
    ratingByTargetId = new Map();
  }

  const { data: incomingMutuals } = await supabase
    .from("discover_swipes")
    .select("viewer_id")
    .eq("target_id", user.id)
    .in("action", ["save", "interested"]);
  const likedMeBack = new Set(
    (incomingMutuals ?? []).map((r) => r.viewer_id as string),
  );

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const ordered = orderedIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-12 pt-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Saved</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        Bookmarks from Discover. Mutual matches chat in{" "}
        <Link href="/matches" className="font-medium text-amber-400/90 underline-offset-2 hover:underline">
          Messages
        </Link>
        .
      </p>
      {notice ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <span>{notice}</span>
          {undoTarget && (undoAction === "save" || undoAction === "interested") ? (
            <form
              action={async () => {
                "use server";
                await setDiscoverAction(undoTarget, undoAction, "/saved");
                redirect("/saved?notice=Undone");
              }}
            >
              <button
                type="submit"
                className="rounded-full border border-emerald-400/50 px-3 py-1 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/20"
              >
                Undo
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
      <ul className="mt-8 space-y-2">
        {ordered.map((p) => {
          const name = p.display_name?.trim() || "Member";
          const city = p.city?.trim();
          const isMatch = likedMeBack.has(p.id);
          const initials = profileInitials(p.display_name);
          return (
            <li key={p.id}>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02]">
                <div className="flex gap-3 p-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600/40 to-zinc-800/30 text-xs font-semibold text-zinc-200"
                    aria-hidden
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/p/${p.id}`}
                      className="font-semibold text-zinc-100 transition hover:text-amber-300"
                    >
                      {name}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {roleLabel(p.role)}
                      {city ? ` · ${city}` : ""}
                      {p.niche?.trim() ? ` · ${p.niche.trim()}` : ""}
                    </p>
                    {isMatch ? (
                      <Link
                        href={`/matches/${p.id}`}
                        className="mt-3 inline-flex rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/35 transition hover:bg-emerald-500/30"
                      >
                        Open chat — you matched
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-white/5 px-4 py-2">
                  <form
                    action={async () => {
                      "use server";
                      await setDiscoverAction(p.id, "interested", "/saved");
                      redirect(
                        `/saved?notice=${encodeURIComponent("Moved to Interested")}&undoTarget=${encodeURIComponent(p.id)}&undoAction=save`,
                      );
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
                    >
                      Interested
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await removeDiscoverAction(p.id, "/saved");
                      redirect(
                        `/saved?notice=${encodeURIComponent("Removed")}&undoTarget=${encodeURIComponent(p.id)}&undoAction=save`,
                      );
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full px-3 py-1 text-xs font-medium text-zinc-500 transition hover:text-red-300/90"
                    >
                      Remove
                    </button>
                  </form>
                </div>
                <div className="border-t border-white/5 px-4 pb-4 pt-2">
                  <ProfileRatingEditor
                    targetId={p.id}
                    initialRating={ratingByTargetId.get(p.id) ?? null}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
