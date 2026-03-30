import Link from "next/link";
import { redirect } from "next/navigation";
import { removeDiscoverAction, setDiscoverAction } from "@/app/explore/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { ProfileRatingEditor } from "@/components/profile-rating-editor";
import { profileInitials } from "@/lib/match-ui";
import { roleLabel } from "@/lib/role-label";

export default async function InterestedPage({
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
    redirect("/login?next=/interested");
  }
  const params = await searchParams;
  const notice = params.notice ? decodeURIComponent(params.notice) : null;
  const undoTarget = params.undoTarget ?? null;
  const undoAction = params.undoAction ?? null;

  const { data: rows, error: swipeError } = await supabase
    .from("discover_swipes")
    .select("target_id, created_at")
    .eq("viewer_id", user.id)
    .eq("action", "interested")
    .order("created_at", { ascending: false });

  if (swipeError) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Couldn&apos;t load interested profiles yet. Run the latest migrations and try again.
        </p>
      </main>
    );
  }

  const orderedIds = rows?.map((r) => r.target_id) ?? [];

  const { data: incomingMutuals } = await supabase
    .from("discover_swipes")
    .select("viewer_id")
    .eq("target_id", user.id)
    .in("action", ["save", "interested"]);

  const likedMeBack = new Set(
    (incomingMutuals ?? []).map((r) => r.viewer_id as string),
  );

  if (!orderedIds.length) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Interested</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
          Swipe up on Discover on people you want to work with. If you both like each other,
          you&apos;ll match and can chat in Messages — no extra steps.
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
    .select("id, display_name, role, niche, city")
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

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const ordered = orderedIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-12 pt-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Interested</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        People you swiped up on. Mutual matches can message in{" "}
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
                await setDiscoverAction(undoTarget, undoAction, "/interested");
                redirect("/interested?notice=Undone");
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
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/20 text-xs font-semibold text-amber-50"
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
                    ) : (
                      <p className="mt-2 text-xs text-zinc-500">Waiting for them to like you back.</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-white/5 px-4 py-2">
                  <form
                    action={async () => {
                      "use server";
                      await setDiscoverAction(p.id, "save", "/interested");
                      redirect(
                        `/interested?notice=${encodeURIComponent("Moved to Saved")}&undoTarget=${encodeURIComponent(p.id)}&undoAction=interested`,
                      );
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full border border-white/12 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
                    >
                      Save for later
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await removeDiscoverAction(p.id, "/interested");
                      redirect(
                        `/interested?notice=${encodeURIComponent("Removed")}&undoTarget=${encodeURIComponent(p.id)}&undoAction=interested`,
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
