import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How prodLink works: nearby discovery, profile audio, matches. Roadmap: ~15s card previews, ID + linked SoundCloud, Stripe Connect / Plaid, labels role, dual roles, tighter proximity.",
};

const steps = [
  {
    title: "Build a real profile",
    body: "Pick your role, describe your sound or room, add location so people nearby can find you, and use prompts that make it easy to start the right conversation.",
  },
  {
    title: "Discover nearby, with less noise",
    body: "Swipe through active profiles, tune distance when you need it (more granular miles and neighborhood-style filters are on the roadmap), and open full profiles when someone looks like a real fit—not another anonymous global feed.",
  },
  {
    title: "Move while momentum is high",
    body: "Save people you want to keep, message your matches quickly, and use notifications so conversations don&apos;t go cold.",
  },
];

const roles = [
  "Artists can show personality, sound, and who they want to work with.",
  "Producers and engineers can lead with their taste, sessions, and what kind of artists they help best.",
  "DJs can highlight their energy, rooms, and the scenes they fit.",
  "Venues and promoters can stay focused on talent discovery and booking fit.",
  "Record labels (planned): a dedicated path for genre-agnostic track pitching—not locked to one house or scene.",
];

export default function HowItWorksPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <section className="rounded-[32px] border border-white/10 bg-zinc-900/45 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">
          How prodLink works · beta
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Find collaborators near you—not just another follower count.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Emerging artists, producers, and DJs use prodLink to meet real people in their
          scene. Profiles stay specific, discover stays local when you want it, and
          audio helps you hear the fit before you DM.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/explore"
            className="inline-flex rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            Open Discover
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Build your profile
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-3xl border border-white/10 bg-zinc-900/35 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/80">
              Step {index + 1}
            </p>
            <h2 className="mt-3 text-lg font-semibold text-zinc-100">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <article className="rounded-3xl border border-white/10 bg-zinc-900/35 p-6">
          <h2 className="text-lg font-semibold text-zinc-100">Best way to use discover</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
            <li>Lead with the main card first. Only open filters when you need to narrow the feed.</li>
            <li>Open a card, hear the sound, then decide fast.</li>
            <li>Open the full profile when someone looks promising so you can read their prompts and goals before messaging.</li>
          </ul>
        </article>

        <article className="rounded-3xl border border-white/10 bg-zinc-900/35 p-6">
          <h2 className="text-lg font-semibold text-zinc-100">Who can we help?</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
            {roles.map((role) => (
              <li key={role}>{role}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900/35 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-zinc-100">Beta, safety, and what&apos;s next</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-400">
          <p>
            prodLink is in <strong className="font-medium text-zinc-300">beta</strong>
            —we&apos;re shipping with early users and adjusting fast. Early supporters get{" "}
            <strong className="font-medium text-zinc-300">beta perks</strong> as major
            features go live. If something feels off, use{" "}
            <Link href="/help" className="font-medium text-amber-400/95 underline-offset-2 hover:underline">
              Help
            </Link>{" "}
            to reach us.
          </p>
          <p>
            We&apos;re serious about{" "}
            <strong className="font-medium text-zinc-300">real people and safer connections</strong>
            . On the roadmap: government ID and face verification, linked SoundCloud (or
            similar), short playable clips on cards (often around 15 seconds), and{" "}
            <strong className="font-medium text-zinc-300">dual roles</strong> (e.g. producer
            and DJ) from one profile. Until those ship, treat off-platform payments and
            deals as <strong className="font-medium text-zinc-300">your own risk</strong>.
          </p>
          <p>
            <strong className="font-medium text-zinc-300">In-app beat and bundle sales</strong>{" "}
            are planned via <strong className="font-medium text-zinc-300">Stripe Connect</strong>
            {" "}and/or <strong className="font-medium text-zinc-300">Plaid</strong>-style
            flows so checkout stays credible and in-app. We&apos;ll share updates as they
            ship.
          </p>
          <p>
            On <strong className="font-medium text-zinc-300">pricing</strong>, we&apos;re
            aiming for fair access—not a steep monthly gate like some creator platforms.
            Specifics will come with paid features.
          </p>
        </div>
      </section>
    </main>
  );
}
