import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works",
};

const steps = [
  {
    title: "Build a real profile",
    body: "Pick your role, describe your sound or room, and add prompts that make it easy for the right people to start the conversation.",
  },
  {
    title: "Discover with less noise",
    body: "Use filters only when you need them, swipe through active profiles, and open full profiles when someone looks like a real fit.",
  },
  {
    title: "Move while momentum is high",
    body: "Save the people you want to keep, message your matches quickly, and use notifications to stay on top of conversations.",
  },
];

const roles = [
  "Artists can show personality, sound, and who they want to work with.",
  "Producers and engineers can lead with their taste, sessions, and what kind of artists they help best.",
  "DJs can highlight their energy, rooms, and the scenes they fit.",
  "Venues and promoters can stay focused on talent discovery and booking fit.",
];

export default function HowItWorksPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <section className="rounded-[32px] border border-white/10 bg-zinc-900/45 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">
          How prodLink works
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Built to help music people find the right fit faster.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          prodLink works best when profiles feel specific, discover stays focused, and people
          message while the energy is still there.
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
    </main>
  );
}
