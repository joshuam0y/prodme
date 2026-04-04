import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { trackServerEvent } from "@/lib/analytics";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const showSupabaseHint = params.error === "supabase";

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      redirect("/explore");
    }
  }

  await trackServerEvent({ event: "landing_opened", path: "/" });

  return (
    <main className="flex flex-1 flex-col">
      {showSupabaseHint ? (
        <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200/95">
          Add Supabase keys in{" "}
          <code className="text-amber-100">.env.local</code> (see{" "}
          <code className="text-amber-100">.env.example</code>) to enable sign
          in and saved profiles.
        </div>
      ) : null}

      <section className="relative overflow-hidden border-b border-white/10 px-4 pb-12 pt-12 sm:px-6 sm:pb-14 sm:pt-16">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.18),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 flex justify-center px-2">
              <Image
                src="/prodlink-logo-v2.svg"
                alt="prodLink"
                width={420}
                height={110}
                className="h-auto w-full max-w-[340px] sm:max-w-[420px]"
                priority
              />
            </div>
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-amber-500/90">
              Explore first · FREE TO USE
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
              Discover and connect with{" "}
              <span className="text-amber-400">music collaborators</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">
              Build a profile, share your sound, and find artists, producers, DJs,
              engineers, and venues that match your style and goals.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/explore"
                className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-full bg-amber-500 px-8 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
              >
                Start discovering
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-8 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-zinc-400">
              By role
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-zinc-400">
              By taste
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-zinc-400">
              Audio samples
            </span>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
            {[
              {
                title: "Two-way discovery",
                body: "Artists get the chance to meet both producers and venues.",
              },
              {
                title: "Style-based system",
                body: "Profiles are built on taste and role, for the best possible matches.",
              },
              {
                title: "Samples and previews",
                body: "Profiles can showcase audio samples and cover visuals so people can hear the fit before they reach out.",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/70 to-zinc-950/40 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
              >
                <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-amber-500/80 via-amber-400/40 to-transparent" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-500/85">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-3 font-semibold leading-snug text-zinc-100">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
