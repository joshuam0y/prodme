import Link from "next/link";
import { redirect } from "next/navigation";
import { resendSignupConfirmation, signUp } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/env";

function safeNext(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/onboarding";
  }
  return path;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    next?: string;
  }>;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/?error=supabase");
  }

  const params = await searchParams;
  const next = safeNext(params.next);
  const error = params.error;
  const notice = params.notice;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Create account
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Free to join. Payments stay off while we explore the network.
        </p>

        {notice ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {decodeURIComponent(notice)}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error === "not_configured"
              ? "Supabase is not configured on this deployment."
              : error === "account_exists"
                ? (
                    <>
                      An account with this email already exists. Please{" "}
                      <Link
                        href={`/login?next=${encodeURIComponent(next)}`}
                        className="font-medium text-amber-500 hover:underline"
                      >
                        sign in
                      </Link>{" "}
                      instead.
                    </>
                  )
                : decodeURIComponent(error)}
          </p>
        ) : null}

        <form action={signUp} className="mt-8 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="email" className="text-xs font-medium text-zinc-500">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-xs font-medium text-zinc-500"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
            <p className="mt-1 text-xs text-zinc-600">
              At least 8 characters. Confirm email if your project requires it.
            </p>
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-amber-500 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            Sign up
          </button>
        </form>

        <div className="mt-10 border-t border-white/10 pt-8">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Didn&apos;t get a link or it expired?
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Confirmation links are one-time. Enter your email to receive a new one.
          </p>
          <form action={resendSignupConfirmation} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="next" value={next} />
            <input
              name="email"
              type="email"
              required
              placeholder="your@email.com"
              autoComplete="email"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
            <button
              type="submit"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Resend confirmation
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="font-medium text-amber-500 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
