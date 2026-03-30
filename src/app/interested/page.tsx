import Link from "next/link";
import { redirect } from "next/navigation";
import { removeDiscoverAction, setDiscoverAction } from "@/app/explore/actions";
import {
  saveInterestedPipelineNote,
  setInterestedPipelineStage,
  type InterestedStage,
} from "@/app/interested/actions";
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

const STAGES: { id: InterestedStage; label: string }[] = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "negotiating", label: "Negotiating" },
  { id: "closed", label: "Closed" },
];

export default async function InterestedPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    undoTarget?: string;
    undoAction?: "save" | "interested";
    stage?: InterestedStage | "all";
    sort?: "recent" | "stage";
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
  const stageFilter =
    params.stage === "new" ||
    params.stage === "contacted" ||
    params.stage === "negotiating" ||
    params.stage === "closed" ||
    params.stage === "all"
      ? params.stage
      : "all";
  const sortMode = params.sort === "stage" ? "stage" : "recent";
  const keepQuery = `stage=${encodeURIComponent(stageFilter)}&sort=${encodeURIComponent(sortMode)}`;

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
  const createdAtByTarget = new Map(
    (rows ?? []).map((r) => [r.target_id as string, r.created_at as string]),
  );
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
  let ordered = orderedIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  let pipelineByTarget = new Map<string, { stage: InterestedStage; note: string | null }>();
  try {
    const { data: pipelineRows } = await supabase
      .from("interested_pipeline")
      .select("target_id, stage, note")
      .eq("viewer_id", user.id)
      .in("target_id", orderedIds);
    pipelineByTarget = new Map(
      (pipelineRows ?? []).map((r) => [
        r.target_id as string,
        {
          stage: (r.stage as InterestedStage) ?? "new",
          note: (r.note as string | null) ?? null,
        },
      ]),
    );
  } catch {
    pipelineByTarget = new Map();
  }

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

  if (stageFilter !== "all") {
    ordered = ordered.filter((p) => (pipelineByTarget.get(p.id)?.stage ?? "new") === stageFilter);
  }
  if (sortMode === "stage") {
    const rank: Record<InterestedStage, number> = {
      new: 0,
      contacted: 1,
      negotiating: 2,
      closed: 3,
    };
    ordered = [...ordered].sort((a, b) => {
      const sa = pipelineByTarget.get(a.id)?.stage ?? "new";
      const sb = pipelineByTarget.get(b.id)?.stage ?? "new";
      const byStage = rank[sa] - rank[sb];
      if (byStage !== 0) return byStage;
      return (createdAtByTarget.get(b.id) ?? "").localeCompare(createdAtByTarget.get(a.id) ?? "");
    });
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
        Interested
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Profiles you swiped up on. Messaging and checkout are next.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">Stage</span>
        {(["all", "new", "contacted", "negotiating", "closed"] as const).map((stage) => {
          const href = `/interested?stage=${stage}&sort=${sortMode}`;
          const active = stageFilter === stage;
          return (
            <Link
              key={stage}
              href={href}
              className={`rounded-full px-2.5 py-1 text-xs transition ${
                active
                  ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                  : "border border-white/15 text-zinc-300 hover:bg-white/5"
              }`}
            >
              {stage === "all" ? "All" : stage[0].toUpperCase() + stage.slice(1)}
            </Link>
          );
        })}
        <span className="ml-2 text-[11px] uppercase tracking-wider text-zinc-500">Sort</span>
        <Link
          href={`/interested?stage=${stageFilter}&sort=recent`}
          className={`rounded-full px-2.5 py-1 text-xs transition ${
            sortMode === "recent"
              ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
              : "border border-white/15 text-zinc-300 hover:bg-white/5"
          }`}
        >
          Recent
        </Link>
        <Link
          href={`/interested?stage=${stageFilter}&sort=stage`}
          className={`rounded-full px-2.5 py-1 text-xs transition ${
            sortMode === "stage"
              ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
              : "border border-white/15 text-zinc-300 hover:bg-white/5"
          }`}
        >
          By stage
        </Link>
      </div>
      {notice ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-100">
          <span>{notice}</span>
          {undoTarget && (undoAction === "save" || undoAction === "interested") ? (
            <form
              action={async () => {
                "use server";
                await setDiscoverAction(undoTarget, undoAction, "/interested");
                redirect(`/interested?notice=Undone&${keepQuery}`);
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
          const pipeline = pipelineByTarget.get(p.id);
          const stage = pipeline?.stage ?? "new";
          const outreach = outreachByTarget.get(p.id);
          const outreachStatus = outreach?.status ?? "draft";
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
                        `/interested?notice=${encodeURIComponent("Moved to Saved")}&undoTarget=${encodeURIComponent(p.id)}&undoAction=interested&${keepQuery}`,
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
                        `/interested?notice=${encodeURIComponent("Removed from Interested")}&undoTarget=${encodeURIComponent(p.id)}&undoAction=interested&${keepQuery}`,
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

                <div className="mt-3 rounded-lg border border-white/10 bg-zinc-950/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Pipeline stage
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STAGES.map((s) => (
                      <form
                        key={s.id}
                        action={async () => {
                          "use server";
                          await setInterestedPipelineStage(p.id, s.id, "/interested");
                          redirect(`/interested?notice=Pipeline%20updated&${keepQuery}`);
                        }}
                      >
                        <button
                          type="submit"
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            stage === s.id
                              ? "bg-amber-500/25 text-amber-200 ring-1 ring-amber-500/40"
                              : "border border-white/15 text-zinc-300 hover:bg-white/5"
                          }`}
                        >
                          {s.label}
                        </button>
                      </form>
                    ))}
                  </div>
                  <form
                    className="mt-3"
                    action={async (formData) => {
                      "use server";
                      const note = String(formData.get("note") ?? "");
                      await saveInterestedPipelineNote(p.id, note, "/interested");
                      redirect(`/interested?notice=Note%20saved&${keepQuery}`);
                    }}
                  >
                    <label className="text-[11px] text-zinc-500">Private note</label>
                    <textarea
                      name="note"
                      rows={2}
                      defaultValue={pipeline?.note ?? ""}
                      className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900/70 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-amber-500/60"
                      placeholder="Contact details, timeline, budget, follow-up..."
                    />
                    <button
                      type="submit"
                      className="mt-2 rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
                    >
                      Save note
                    </button>
                  </form>
                </div>

                <div className="mt-3 rounded-lg border border-white/10 bg-zinc-950/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Outreach message
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["draft", "sent", "follow_up"] as const).map((s) => (
                      <form
                        key={s}
                        action={async () => {
                          "use server";
                          await setLeadOutreachStatus(p.id, s, "/interested");
                          redirect(`/interested?notice=Outreach%20updated&${keepQuery}`);
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
                      await saveLeadOutreachDraft(p.id, draft, "/interested");
                      redirect(`/interested?notice=Draft%20saved&${keepQuery}`);
                    }}
                  >
                    <LeadMessageTools
                      displayName={name}
                      roleLabel={roleLabel(p.role)}
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
