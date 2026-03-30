import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { beatsFromProfileRow } from "@/lib/profile-beats";
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
      "id, display_name, role, niche, goal, onboarding_completed_at, star_beat_title, star_beat_audio_url, star_beat_cover_url, extra_beats",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row?.onboarding_completed_at) {
    notFound();
  }

  const profile = row as DbProfile;
  const isOwn = viewer?.id === id;
  const name = profile.display_name?.trim() || "Member";
  const { starBeat, extraBeats } = beatsFromProfileRow({
    id: profile.id,
    star_beat_title: profile.star_beat_title ?? null,
    star_beat_audio_url: profile.star_beat_audio_url ?? null,
    star_beat_cover_url: profile.star_beat_cover_url ?? null,
    extra_beats: profile.extra_beats,
  });

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

      {starBeat ? (
        <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-amber-500/90">
            Star track
          </h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-white/10">
              <Image
                src={starBeat.coverUrl}
                alt=""
                width={96}
                height={96}
                className="h-full w-full object-cover"
                unoptimized={starBeat.coverUrl.includes("picsum.photos")}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-100">{starBeat.title}</p>
              <audio
                controls
                preload="none"
                src={starBeat.audioUrl}
                className="mt-2 h-9 w-full max-w-md"
              >
                <track kind="captions" />
              </audio>
            </div>
          </div>
        </section>
      ) : null}

      {extraBeats?.length ? (
        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            More beats
          </h2>
          <ul className="mt-3 space-y-3">
            {extraBeats.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-zinc-950/40 px-3 py-2"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                  <Image
                    src={b.coverUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    unoptimized={b.coverUrl.includes("picsum.photos")}
                  />
                </div>
                <span className="min-w-0 flex-1 text-sm text-zinc-200">{b.title}</span>
                <audio controls preload="none" src={b.audioUrl} className="h-8 w-full sm:w-48">
                  <track kind="captions" />
                </audio>
              </li>
            ))}
          </ul>
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
