"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  next: string;
  kind: "signup" | "invite" | "email_change";
};

const copyByKind = {
  signup: {
    title: "Email confirmed",
    body: "Your prodLink account is ready. We’re taking you to onboarding now.",
    cta: "Continue to onboarding",
  },
  invite: {
    title: "Invite accepted",
    body: "Your email is confirmed and your invite is ready. We’re taking you to onboarding now.",
    cta: "Continue",
  },
  email_change: {
    title: "Email updated",
    body: "Your new email address has been confirmed. We’re taking you back now.",
    cta: "Continue",
  },
} as const;

export function ConfirmedClient({ next, kind }: Props) {
  const router = useRouter();
  const copy = copyByKind[kind];

  useEffect(() => {
    const id = window.setTimeout(() => {
      router.replace(next);
    }, 1400);
    return () => window.clearTimeout(id);
  }, [next, router]);

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 text-center shadow-xl">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-xl text-emerald-300 ring-1 ring-emerald-500/30">
        ✓
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50">{copy.title}</h1>
      <p className="mt-2 text-sm text-zinc-400">{copy.body}</p>
      <p className="mt-4 text-xs text-zinc-500">Redirecting...</p>
      <Link
        href={next}
        className="mt-6 inline-flex rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
      >
        {copy.cta}
      </Link>
    </div>
  );
}
