import Link from "next/link";
import { redirect } from "next/navigation";
import { removeDiscoverAction, setDiscoverAction } from "@/app/explore/actions";
import {
  saveLeadOutreachDraft,
  setLeadOutreachStatus,
  type LeadOutreachStatus,
} from "@/app/leads/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { LeadMessageTools } from "@/components/lead-message-tools";
import { ProfileRatingEditor } from "@/components/profile-rating-editor";

function roleLabel(raw: string | null): string {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("producer")) return "Producer";
  if (s.includes("dj")) return "DJ";
  if (s.includes("venue") || s.includes("promoter")) return "Venue";
  if (s.includes("artist")) return "Artist";
  return "Artist";
}

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
  const keepQuery = "";

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
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Saved for later
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          When you tap ★ on Discover, profiles show up here.
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

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const ordered = orderedIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  let outreachByTarget = new Map<
    string,
    { status: LeadOutreachStatus; messageDraft: string | null; lastContactedAt: string | null }
  >();
  try {
    const { data: outreachRows } = await supabase
      .from("lead_outreach")
      .select("target_id, status, message_draft, last_contacted_at")
      .eq("viewer_id", user.id)
      .in("target_id", orderedIds);
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
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
        Saved for later
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        From Discover — tap a name to open their public profile.
      </p>
      {notice ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-100">
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
                      await setDiscoverAction(p.id, "interested", "/saved");
                      redirect(
                        `/saved?notice=${encodeURIComponent("Moved to Interested")}&undoTarget=${encodeURIComponent(p.id)}&undoAction=save`,
                      );
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
                      await removeDiscoverAction(p.id, "/saved");
                      redirect(
                        `/saved?notice=${encodeURIComponent("Removed from Saved")}&undoTarget=${encodeURIComponent(p.id)}&undoAction=save`,
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

                {(() => {
                  const outreach = outreachByTarget.get(p.id);
                  const outreachStatus = outreach?.status ?? "draft";
                  return (
                    <div className="mt-3 rounded-lg border border-white/10 bg-zinc-950/30 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Outreach prep
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(["draft", "sent", "follow_up"] as const).map((s) => (
                          <form
                            key={s}
                            action={async () => {
                              "use server";
                              await setLeadOutreachStatus(p.id, s, "/saved");
                              redirect(`/saved?notice=Outreach%20updated${keepQuery}`);
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
                          await saveLeadOutreachDraft(p.id, draft, "/saved");
                          redirect(`/saved?notice=Draft%20saved${keepQuery}`);
                        }}
                      >
                        <LeadMessageTools
                          displayName={name}
                          roleLabel={roleLabel(p.role)}
                          context="saved"
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
                  );
                })()}

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
