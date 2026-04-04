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
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-amber-500/90">
              Beta · explore first · free to use
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
              Discover and connect with{" "}
              <span className="text-amber-400">music collaborators</span>{" "}
              nearby
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">
              For emerging artists, producers, and DJs who want{" "}
              <span className="text-zinc-300">real collaborators</span>, not
              another global popularity contest. Build a profile, share your
              sound, and find engineers, venues, and creatives around you who fit
              your style and goals.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-zinc-500 sm:text-base">
              We&apos;re focused on real people and safer connections:
              stronger verification and in-app payments are on the roadmap
              (including options like Stripe Connect and Plaid-style flows for
              credibility). We&apos;re growing prodLink with early users—beta
              supporters will get perks as major features land.
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
              Nearby
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-zinc-400">
              By role
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-zinc-400">
              By taste
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-zinc-400">
              Hear the fit on profiles
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-zinc-400">
              All genres
            </span>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
            {[
              {
                title: "Two-way discovery",
                body: "Meet producers, DJs, and venues who actually fit—starting with who is active around you.",
              },
              {
                title: "Style-based system",
                body: "Role, taste, and distance when you need it—so the feed stays relevant.",
              },
              {
                title: "Samples and previews",
                body: "Show audio on your profile so others can hear your sound and decide if it fits. Short in-feed previews (think ~15 seconds) are on the roadmap for cards.",
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

          <div className="mt-14 border-t border-white/10 pt-14">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
                Local scenes, not global noise
              </h2>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-zinc-500 sm:text-base">
                Finding the right people in your city shouldn&apos;t take months of
                cold DMs. prodLink is in beta—we&apos;re building match-based
                discovery with people nearby, audio on profiles, and safer
                connections over time.
              </p>
            </div>
            <ul className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2 sm:gap-5">
              {[
                {
                  title: "Emerging artists & producers first",
                  body: "Smaller acts feel the friction most: gigs and collaborators are hyperlocal, and standing out on huge platforms takes forever.",
                },
                {
                  title: "Hear the fit, then say hi",
                  body: "Use profile audio and full cards to judge taste before you message—so conversations start with context.",
                },
                {
                  title: "Safety & payments, on the roadmap",
                  body: "We care about real people and fewer scams. Planned: government ID and face verification, linked accounts (e.g. SoundCloud) to reduce bots and theft, and checkout via Stripe Connect and/or Plaid-style flows. Off-platform deals stay at your own risk until then.",
                },
                {
                  title: "Help us shape it",
                  body: "Early users get a direct line to what we build next—beta perks as we ship. Tell us what your scene needs.",
                },
              ].map((row) => (
                <li
                  key={row.title}
                  className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 text-left"
                >
                  <p className="font-semibold text-zinc-200">{row.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    {row.body}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-6 sm:p-8">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-amber-500/90">
                On the roadmap
              </p>
              <h2 className="mt-3 text-center text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">
                What we&apos;re building next
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-zinc-500">
                Grounded in interviews with working DJs, producers, and artists—not
                everything below is live yet, but this is the direction.
              </p>
              <ul className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-400">
                <li>
                  <strong className="font-medium text-zinc-300">Short audio on cards</strong>{" "}
                  — playable previews on profile cards (think bite-sized clips, often
                  around 15 seconds) so people hear your work in flow.
                </li>
                <li>
                  <strong className="font-medium text-zinc-300">Verification</strong>{" "}
                  — government ID and face checks, plus linked SoundCloud (or similar)
                  to cut bots, impersonation, and casual music theft.
                </li>
                <li>
                  <strong className="font-medium text-zinc-300">In-app beat sales</strong>{" "}
                  — Stripe Connect and/or Plaid-backed flows so money and credibility
                  stay inside prodLink instead of random wire requests.
                </li>
                <li>
                  <strong className="font-medium text-zinc-300">Record labels</strong>{" "}
                  — a label role so artists can pitch tracks in-app,{" "}
                  <strong className="font-medium text-zinc-300">genre-agnostic</strong>{" "}
                  (not locked to one scene the way some pitch tools are).
                </li>
                <li>
                  <strong className="font-medium text-zinc-300">Dual roles</strong>{" "}
                  — e.g. producer and DJ in one account when you do both, so you can
                  search and be discovered for each hat.
                </li>
                <li>
                  <strong className="font-medium text-zinc-300">Tighter proximity</strong>{" "}
                  — distance in miles, neighborhoods, and sort options beyond only
                  &quot;new&quot; and &quot;trending&quot; so gigs and collabs stay hyperlocal.
                </li>
              </ul>
              <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-zinc-500">
                On pricing, we&apos;re aiming for{" "}
                <strong className="font-medium text-zinc-400">
                  fair access
                </strong>
                —not a steep monthly gate like some creator platforms. Details will
                ship with paid features.
              </p>
            </div>

            <p className="mx-auto mt-10 text-center">
              <Link
                href="/how-it-works"
                className="text-sm font-medium text-amber-400/95 underline-offset-4 transition hover:underline"
              >
                Full walkthrough: how Discover and profiles work
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
