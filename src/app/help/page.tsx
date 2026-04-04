import type { Metadata } from "next";
import Link from "next/link";
import { getSupportEmail } from "@/lib/env";

export const metadata: Metadata = {
  title: "Help center",
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
        Questions about profiles, discover, or your account? Reach out and we will get back to you.
      </p>

      <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/35 p-6">
        <h2 className="text-sm font-semibold text-zinc-100">Contact</h2>
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
