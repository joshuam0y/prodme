import type { Metadata } from "next";
import Link from "next/link";
import { getSupportEmail } from "@/lib/env";

export const metadata: Metadata = {
  title: "Help center",
  description:
    "prodLink help: beta, roadmap (audio clips, verification, Stripe Connect, labels), safety, pricing philosophy, support.",
};

export default function HelpPage() {
  const email = getSupportEmail();
  const mailto =
    email.length > 0
      ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("prodLink question")}`
      : null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Help center</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Questions about profiles, discover, or your account? Reach out and we will get back
        to you.
      </p>

      <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/35 p-6">
        <h2 className="text-sm font-semibold text-zinc-100">Common questions</h2>
        <dl className="mt-4 space-y-5 text-sm leading-relaxed text-zinc-400">
          <div>
            <dt className="font-medium text-zinc-200">Is prodLink finished?</dt>
            <dd className="mt-1.5">
              No—we&apos;re in <strong className="font-medium text-zinc-300">beta</strong>.
              Features and policies will evolve; we&apos;re building with early users and
              feedback.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-200">Who is prodLink for?</dt>
            <dd className="mt-1.5">
              Especially{" "}
              <strong className="font-medium text-zinc-300">
                emerging artists, producers, and DJs
              </strong>{" "}
              who want collaborators and gigs{" "}
              <strong className="font-medium text-zinc-300">nearby</strong>, not another
              global popularity contest. Venues and engineers are welcome too.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-200">Can I buy or sell beats in the app?</dt>
            <dd className="mt-1.5">
              <strong className="font-medium text-zinc-300">In-app checkout is not live yet.</strong>{" "}
              We plan sales for beats and bundles using{" "}
              <strong className="font-medium text-zinc-300">Stripe Connect</strong> and/or{" "}
              <strong className="font-medium text-zinc-300">Plaid</strong>-style flows so
              money can move inside prodLink with clearer records. Until then, anything you
              arrange off-platform is between you and the other party.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-200">Will there be short audio clips on cards?</dt>
            <dd className="mt-1.5">
              <strong className="font-medium text-zinc-300">On the roadmap.</strong> We want
              playable previews on profile cards—often around{" "}
              <strong className="font-medium text-zinc-300">15 seconds</strong>—so people
              hear your work in flow (similar in spirit to voice prompts on dating apps).
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-200">What about verification?</dt>
            <dd className="mt-1.5">
              Planned: <strong className="font-medium text-zinc-300">government ID</strong>,{" "}
              <strong className="font-medium text-zinc-300">face verification</strong>, and{" "}
              <strong className="font-medium text-zinc-300">linked SoundCloud</strong> (or
              similar) to reduce bots, impersonation, and casual music theft. Not live yet.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-200">Will labels and pitching be in prodLink?</dt>
            <dd className="mt-1.5">
              We&apos;re planning a <strong className="font-medium text-zinc-300">record label</strong>{" "}
              role so artists can pitch tracks in-app—{" "}
              <strong className="font-medium text-zinc-300">genre-agnostic</strong>, not
              limited to a single scene. Timing TBD.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-200">Can one person be both a producer and a DJ?</dt>
            <dd className="mt-1.5">
              <strong className="font-medium text-zinc-300">Dual roles are on the roadmap</strong>{" "}
              so you can wear more than one hat from a single account when the product
              supports it.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-200">How will discover handle distance?</dt>
            <dd className="mt-1.5">
              You can filter by distance today in beta; we&apos;re building toward{" "}
              <strong className="font-medium text-zinc-300">tighter proximity</strong>—miles,
              neighborhoods, and sorts beyond only &quot;new&quot; and &quot;trending&quot;—so
              local gigs and collabs are easier to find.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-200">How will pricing work?</dt>
            <dd className="mt-1.5">
              We&apos;re aiming for <strong className="font-medium text-zinc-300">fair access</strong>{" "}
              and want to avoid a steep monthly gate like some creator platforms. Paid
              details will ship with the features they support.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-200">How should I stay safe?</dt>
            <dd className="mt-1.5">
              Be cautious of scams and fake profiles—never assume someone is who they claim
              without checking. We&apos;re working toward stronger verification and safer
              in-app transactions; until then, use the same judgment you would anywhere
              online.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/35 p-6">
        <h2 className="text-sm font-semibold text-zinc-100">Contact us</h2>
        {mailto ? (
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Email{" "}
            <a href={mailto} className="font-medium text-amber-400/95 underline-offset-2 hover:underline">
              {email}
            </a>
            . You can describe your question in your mail app before sending.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Set{" "}
            <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-zinc-300">
              NEXT_PUBLIC_SUPPORT_EMAIL
            </code>{" "}
            in your environment to show a support address here.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/35 p-6">
        <h2 className="text-sm font-semibold text-zinc-100">Quick links</h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-400">
          <li>
            <Link href="/how-it-works" className="text-amber-400/95 hover:underline">
              How prodLink works
            </Link>
          </li>
          <li>
            <Link href="/profile" className="text-amber-400/95 hover:underline">
              Edit your profile &amp; privacy
            </Link>
          </li>
          <li>
            <Link href="/explore" className="text-amber-400/95 hover:underline">
              Discover
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
