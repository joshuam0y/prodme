import Link from "next/link";
import { redirect } from "next/navigation";
import { removeDiscoverAction, setDiscoverAction } from "@/app/explore/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { ProfileRatingEditor } from "@/components/profile-rating-editor";

function roleLabel(raw: string | null): string {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("producer")) return "Producer";
  if (s.includes("dj")) return "DJ";
  if (s.includes("venue") || s.includes("promoter")) return "Venue";
  if (s.includes("artist")) return "Artist";
  return "Artist";
}

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
  if (!orderedIds.length) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Interested
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          Swipe up on Discover to mark profiles you want to buy from or work with.
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
    // Ratings optional; if table doesn't exist yet, show rating editor in disabled mode.
    ratingByTargetId = new Map();
  }

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const ordered = orderedIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
        Interested
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Profiles you swiped up on. Messaging and checkout are next.
      </p>
      {notice ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-100">
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
      <ul className="mt-8 space-y-3">
        {ordered.map((p) => {
          const name = p.display_name?.trim() || "Member";
          const city = p.city?.trim();
          return (
            <li key={p.id}>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 sm:px-4">
                <Link
                  href={`/p/${p.id}`}
                  className="flex flex-col transition hover:text-amber-300"
                >
                  <span className="font-medium text-zinc-100">{name}</span>
                  <span className="mt-0.5 text-xs text-zinc-500">
                    {roleLabel(p.role)}
                    {city ? ` · ${city}` : ""}
                    {p.niche?.trim() ? ` · ${p.niche.trim()}` : ""}
                  </span>
                </Link>
                <div className="mt-3 flex flex-wrap gap-2">
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
                      className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      Move to Saved
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await removeDiscoverAction(p.id, "/interested");
                      redirect(
                        `/interested?notice=${encodeURIComponent("Removed from Interested")}&undoTarget=${encodeURIComponent(p.id)}&undoAction=interested`,
                      );
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
                    >
                      Remove
                    </button>
                  </form>
                </div>

                <ProfileRatingEditor
                  targetId={p.id}
                  initialRating={ratingByTargetId.get(p.id) ?? null}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
