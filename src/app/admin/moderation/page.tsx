import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail, isSupabaseConfigured } from "@/lib/env";
import { resolveReport, setProfileVerified, unblockProfile } from "./actions";

type ReportRow = {
  id: number;
  reporter_id: string;
  reported_user_id: string;
  message_id: number | null;
  reason: string;
  details: string | null;
  ai_summary?: string | null;
  ai_priority?: "low" | "medium" | "high" | null;
  ai_labels?: unknown;
  status: "open" | "resolved";
  created_at: string;
};

type BlockRow = {
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
};

export default async function ModerationAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; q?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/?error=supabase");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/moderation");
  if (!isAdminEmail(user.email)) redirect("/explore?notice=Admin%20access%20required");

  const params = await searchParams;
  const notice = params.notice ? decodeURIComponent(params.notice) : null;
  const query = (params.q ? decodeURIComponent(params.q) : "").trim();

  const { data: reports } = await supabase
    .from("match_message_reports")
    .select("id, reporter_id, reported_user_id, message_id, reason, details, ai_summary, ai_priority, ai_labels, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: blocks } = await supabase
    .from("profile_blocks")
    .select("blocker_id, blocked_id, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const { count: signupsCount } = await supabase
    .from("product_events")
    .select("id", { count: "exact", head: true })
    .eq("event_name", "sign_up_succeeded");
  const { count: onboardingCount } = await supabase
    .from("product_events")
    .select("id", { count: "exact", head: true })
    .eq("event_name", "onboarding_completed");
  const { count: matchCount } = await supabase
    .from("product_events")
    .select("id", { count: "exact", head: true })
    .eq("event_name", "match_created");
  const { count: messageCount } = await supabase
    .from("product_events")
    .select("id", { count: "exact", head: true })
    .eq("event_name", "message_sent");
  const { data: recentEvents } = await supabase
    .from("product_events")
    .select("id, event_name, user_id, path, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  const userLookup = query
    ? await supabase
        .from("profiles")
        .select("id, display_name, role, city, verified, looking_for, updated_at")
        .or(`id.eq.${query},display_name.ilike.%${query.replace(/[%_,]/g, "")}%`)
        .order("updated_at", { ascending: false })
        .limit(20)
    : { data: [] };
  const openCount = ((reports as ReportRow[] | null) ?? []).filter((r) => r.status === "open").length;
  const blockRows = (blocks as BlockRow[] | null) ?? [];
  const blockKey = (a: string, b: string) => `${a}:${b}`;
  const activeBlocks = new Set(blockRows.map((b) => blockKey(b.blocker_id, b.blocked_id)));

  const involvedProfileIds = new Set<string>();
  for (const r of (reports as ReportRow[] | null) ?? []) {
    involvedProfileIds.add(r.reported_user_id);
    involvedProfileIds.add(r.reporter_id);
  }
  for (const b of blockRows) {
    involvedProfileIds.add(b.blocked_id);
    involvedProfileIds.add(b.blocker_id);
  }

  const { data: profilesForAdmin } = involvedProfileIds.size
    ? await supabase.from("profiles").select("id, verified").in("id", [...involvedProfileIds])
    : { data: [] };
  const verifiedById = new Map(
    ((profilesForAdmin as Array<{ id: string; verified: boolean }> | null) ?? []).map((p) => [
      p.id,
      p.verified,
    ]),
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-50">Moderation</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Review reports, resolve cases, and manage blocks. Open reports: {openCount} · Active blocks:{" "}
        {blockRows.length}
      </p>
      {notice ? (
        <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
          {notice}
        </p>
      ) : null}

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Signups", value: signupsCount ?? 0 },
          { label: "Onboarded", value: onboardingCount ?? 0 },
          { label: "Matches", value: matchCount ?? 0 },
          { label: "Messages sent", value: messageCount ?? 0 },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Internal profile lookup</h2>
          <form className="mt-3 flex gap-2" action="/admin/moderation">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by profile ID or display name"
              className="flex-1 rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600"
            />
            <button
              type="submit"
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950"
            >
              Search
            </button>
          </form>
          <p className="mt-2 text-xs text-zinc-500">
            Admin-only lookup. Users still cannot search for each other anywhere in the product.
          </p>
          <ul className="mt-4 space-y-2">
            {(((userLookup.data as Array<{
              id: string;
              display_name: string | null;
              role: string | null;
              city: string | null;
              verified: boolean | null;
              looking_for: string | null;
              updated_at: string | null;
            }> | null) ?? [])).length === 0 ? (
              <li className="rounded-xl border border-white/10 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-500">
                {query ? "No matching profiles found." : "Search a profile by ID or display name."}
              </li>
            ) : (
              (((userLookup.data as Array<{
                id: string;
                display_name: string | null;
                role: string | null;
                city: string | null;
                verified: boolean | null;
                looking_for: string | null;
                updated_at: string | null;
              }> | null) ?? [])).map((p) => (
                <li key={p.id} className="rounded-xl border border-white/10 bg-zinc-950/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 text-sm text-zinc-300">
                      <p className="font-medium text-zinc-100">{p.display_name?.trim() || "Member"}</p>
                      <p className="text-zinc-500">{p.id}</p>
                      <p className="text-zinc-500">
                        {[p.role, p.city, p.verified ? "Verified" : "Not verified"].filter(Boolean).join(" · ")}
                      </p>
                      {p.looking_for?.trim() ? (
                        <p className="text-zinc-400">Looking for: {p.looking_for.trim()}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/p/${p.id}`}
                        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
                      >
                        Public profile
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await setProfileVerified(p.id, !Boolean(p.verified));
                        }}
                      >
                        <button
                          type="submit"
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                            p.verified
                              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                              : "border-white/20 bg-white/5 text-zinc-200"
                          }`}
                        >
                          {p.verified ? "Unverify" : "Verify"}
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Recent product events</h2>
          <ul className="mt-3 space-y-2">
            {((recentEvents as Array<{
              id: number;
              event_name: string;
              user_id: string | null;
              path: string | null;
              created_at: string;
            }> | null) ?? []).map((e) => (
              <li key={e.id} className="rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2">
                <p className="text-sm font-medium text-zinc-100">{e.event_name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {e.path ?? "no-path"} · {e.user_id ?? "anon"} ·{" "}
                  {new Date(e.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Reports</h2>
        <ul className="mt-3 space-y-2">
          {((reports as ReportRow[] | null) ?? []).length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-500">
              No reports yet.
            </li>
          ) : (
            ((reports as ReportRow[] | null) ?? []).map((r) => (
              <li key={r.id} className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 text-sm text-zinc-300">
                    <p>
                      <span className="text-zinc-500">Report</span> #{r.id} ·{" "}
                      <span className={r.status === "open" ? "text-amber-300" : "text-emerald-300"}>
                        {r.status}
                      </span>
                    </p>
                    <p className="text-zinc-400">Reason: {r.reason}</p>
                    <p className="text-zinc-500">Reporter: {r.reporter_id}</p>
                    <p className="text-zinc-500">Reported: {r.reported_user_id}</p>
                    {r.message_id ? <p className="text-zinc-500">Message ID: {r.message_id}</p> : null}
                    {r.details ? <p className="text-zinc-400">Details: {r.details}</p> : null}
                    {r.ai_summary?.trim() ? (
                      <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/90">
                          AI triage
                        </p>
                        <p className="mt-1 text-zinc-300">{r.ai_summary.trim()}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {r.ai_priority ? (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                r.ai_priority === "high"
                                  ? "bg-red-500/15 text-red-200 ring-1 ring-red-500/35"
                                  : r.ai_priority === "medium"
                                    ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/35"
                                    : "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/35"
                              }`}
                            >
                              {r.ai_priority} priority
                            </span>
                          ) : null}
                          {Array.isArray(r.ai_labels)
                            ? r.ai_labels
                                .filter((label): label is string => typeof label === "string" && label.trim().length > 0)
                                .slice(0, 5)
                                .map((label) => (
                                  <span
                                    key={`${r.id}-${label}`}
                                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-zinc-300"
                                  >
                                    {label}
                                  </span>
                                ))
                            : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                      <form
                        action={async () => {
                          "use server";
                          const next = !verifiedById.get(r.reported_user_id);
                          await setProfileVerified(r.reported_user_id, next);
                        }}
                      >
                        <button
                          type="submit"
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            verifiedById.get(r.reported_user_id)
                              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                              : "border-white/20 bg-white/5 text-zinc-200 hover:bg-white/10"
                          }`}
                        >
                          {verifiedById.get(r.reported_user_id) ? "Verified" : "Not verified"}
                        </button>
                      </form>
                    {r.status === "open" ? (
                      <form
                        action={async () => {
                          "use server";
                          await resolveReport(r.id, "resolved");
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-full border border-emerald-500/40 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10"
                        >
                          Resolve
                        </button>
                      </form>
                    ) : (
                      <form
                        action={async () => {
                          "use server";
                          await resolveReport(r.id, "open");
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5"
                        >
                          Re-open
                        </button>
                      </form>
                    )}
                    {activeBlocks.has(blockKey(r.reporter_id, r.reported_user_id)) ? (
                      <form
                        action={async () => {
                          "use server";
                          await unblockProfile(r.reporter_id, r.reported_user_id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-full border border-red-500/35 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10"
                        >
                          Unblock pair
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Blocks</h2>
        <ul className="mt-3 space-y-2">
          {blockRows.length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-500">
              No active blocks. The Unblock button appears after someone uses &quot;Block profile&quot; in chat.
            </li>
          ) : (
            blockRows.map((b) => (
              <li key={`${b.blocker_id}:${b.blocked_id}`} className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 text-sm text-zinc-300">
                    <p className="text-zinc-500">Blocker: {b.blocker_id}</p>
                    <p className="text-zinc-500">Blocked: {b.blocked_id}</p>
                    {b.reason ? <p className="text-zinc-400">Reason: {b.reason}</p> : null}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await unblockProfile(b.blocker_id, b.blocked_id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full border border-red-500/35 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10"
                    >
                      Unblock
                    </button>
                  </form>
                          <form
                            action={async () => {
                              "use server";
                              const next = !verifiedById.get(b.blocked_id);
                              await setProfileVerified(b.blocked_id, next);
                            }}
                          >
                            <button
                              type="submit"
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                verifiedById.get(b.blocked_id)
                                  ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                                  : "border-white/20 bg-white/5 text-zinc-200 hover:bg-white/10"
                              }`}
                            >
                              {verifiedById.get(b.blocked_id) ? "Verified" : "Not verified"}
                            </button>
                          </form>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
