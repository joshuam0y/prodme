import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/uuid";
import type { DbProfile } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id) || !isSupabaseConfigured()) {
    return { title: "Profile" };
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("profiles")
    .select("display_name, niche")
    .eq("id", id)
    .not("onboarding_completed_at", "is", null)
    .maybeSingle();

  const p = row as Pick<DbProfile, "display_name" | "niche"> | null;
  const name = p?.display_name?.trim() || "Member";
  const title = p ? `${name} on prod.me` : "Profile";
  const description = p?.niche?.trim() || "Music profile on prod.me";

  return {
    title: p ? name : "Profile",
    description,
    openGraph: { title, description },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;

  if (!isUuid(id) || !isSupabaseConfigured()) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: row, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, role, niche, goal, onboarding_completed_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row?.onboarding_completed_at) {
    notFound();
  }

  const profile = row as DbProfile;
  const isOwn = viewer?.id === id;
  const name = profile.display_name?.trim() || "Member";

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <div
        className={`mb-8 h-32 rounded-2xl bg-gradient-to-br ${
          profile.role?.toLowerCase().includes("producer")
            ? "from-violet-600 to-fuchsia-600"
            : profile.role?.toLowerCase().includes("dj")
              ? "from-amber-500 to-orange-600"
              : profile.role?.toLowerCase().includes("venue") ||
                  profile.role?.toLowerCase().includes("promoter")
                ? "from-slate-600 to-zinc-700"
                : "from-emerald-600 to-teal-600"
        } opacity-90`}
        aria-hidden
      />

      {isOwn ? (
        <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-200/90">
          This is your public profile — what others see when you share your link.
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          {name}
        </h1>
        <p className="text-sm text-zinc-400">
          {profile.role ?? "Creator"}
          {profile.niche ? ` · ${profile.niche}` : null}
        </p>
      </div>

      {profile.goal ? (
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Focus
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {profile.goal}
          </p>
        </section>
      ) : null}

      {profile.niche ? (
        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Niche
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {profile.niche}
          </p>
        </section>
      ) : null}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/explore"
          className="inline-flex justify-center rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
        >
          Back to Discover
        </Link>
        {viewer ? (
          <Link
            href="/profile"
            className="inline-flex justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Your profile
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Sign in
          </Link>
        )}
      </div>
    </main>
  );
}
