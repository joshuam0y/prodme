import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail, isSupabaseConfigured } from "@/lib/env";
import { resolveReport, unblockProfile } from "./actions";

type ReportRow = {
  id: number;
  reporter_id: string;
  reported_user_id: string;
  message_id: number | null;
  reason: string;
  details: string | null;
  status: "open" | "resolved";
  created_at: string;
};

type BlockRow = {
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
};

export default async function ModerationAdminPage() {
  if (!isSupabaseConfigured()) redirect("/?error=supabase");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/moderation");
  if (!isAdminEmail(user.email)) redirect("/explore?notice=Admin%20access%20required");

  const { data: reports } = await supabase
    .from("match_message_reports")
    .select("id, reporter_id, reported_user_id, message_id, reason, details, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: blocks } = await supabase
    .from("profile_blocks")
    .select("blocker_id, blocked_id, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const openCount = ((reports as ReportRow[] | null) ?? []).filter((r) => r.status === "open").length;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-50">Moderation</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Review reports, resolve cases, and manage blocks. Open reports: {openCount}
      </p>

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
                  </div>
                  <div className="flex gap-2">
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
          {((blocks as BlockRow[] | null) ?? []).length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-500">
              No active blocks.
            </li>
          ) : (
            ((blocks as BlockRow[] | null) ?? []).map((b) => (
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
                      await unblockProfile(b.blocked_id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full border border-red-500/35 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10"
                    >
                      Unblock
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
