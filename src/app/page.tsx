import Link from "next/link";
import { trackServerEvent } from "@/lib/analytics";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const showSupabaseHint = params.error === "supabase";
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

      <section className="relative overflow-hidden border-b border-white/10 px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.18),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-amber-500/90">
            Explore first · FREE TO USE
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Discover and connect with{" "}
            <span className="text-amber-400">music collaborators</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-zinc-400">
            Build a profile, share your sound, and find artists, producers, DJs,
            and venues that match your style and goals.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/explore"
              className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-full bg-amber-500 px-8 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              Start discovering
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-8 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Build your profile
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:grid-cols-3 sm:px-6">
        {[
          {
            title: "Two-way discovery",
            body: "Artists meet producers and venues—everyone has a reason to show real work, not just a link in bio.",
          },
          {
            title: "Style, not noise",
            body: "Profiles are built around taste and role—so matches feel intentional, not random.",
          },
          {
            title: "Bundles & previews",
            body: "Producers package beats; artists and venues browse and preview before they commit.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6"
          >
            <h2 className="font-semibold text-zinc-100">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              {item.body}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
