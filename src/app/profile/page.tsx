import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDisplayDate } from "@/lib/format-date";
import { isProfileQuestionnaireComplete } from "@/lib/profile-completion";
import type { DbProfile } from "@/lib/types";

export default async function ProfilePage() {
  if (!isSupabaseConfigured()) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const { data: row, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, role, niche, goal, onboarding_completed_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile = row as DbProfile | null;

  const incomplete = !isProfileQuestionnaireComplete(profile);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
        Your profile
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        What others will use to understand your niche and goals.
      </p>

      {error ? (
        <p className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error.message}
        </p>
      ) : null}

      <dl className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Name
          </dt>
          <dd className="mt-1 text-zinc-100">
            {profile?.display_name?.trim() || user.email?.split("@")[0] || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Role
          </dt>
          <dd className="mt-1 text-zinc-100">{profile?.role ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Niche
          </dt>
          <dd className="mt-1 text-zinc-100">{profile?.niche ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Goal
          </dt>
          <dd className="mt-1 text-zinc-100">{profile?.goal ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Profile completed
          </dt>
          <dd className="mt-1 text-zinc-100">
            {formatDisplayDate(profile?.onboarding_completed_at)}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/onboarding"
          className="inline-flex justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
        >
          {incomplete ? "Complete setup" : "Update answers"}
        </Link>
        <Link
          href="/explore"
          className="inline-flex justify-center rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
        >
          Discover
        </Link>
        {!incomplete ? (
          <Link
            href={`/p/${user.id}`}
            className="inline-flex justify-center rounded-full border border-amber-500/35 bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-amber-400 transition hover:bg-amber-500/20"
          >
            View public profile
          </Link>
        ) : null}
      </div>
    </main>
  );
}
