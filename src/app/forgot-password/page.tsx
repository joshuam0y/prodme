import Link from "next/link";
import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/env";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/?error=supabase");
  }

  const params = await searchParams;
  const error = params.error;
  const notice = params.notice;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Reset password
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          We&apos;ll email you a link to choose a new password.
        </p>

        {notice ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {decodeURIComponent(notice)}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error === "not_configured"
              ? "Supabase is not configured."
              : error === "missing_email"
                ? "Enter your email address."
                : decodeURIComponent(error)}
          </p>
        ) : null}

        <form action={requestPasswordReset} className="mt-8 space-y-4">
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
          <button
            type="submit"
            className="w-full rounded-full bg-amber-500 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            Send reset link
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/login" className="font-medium text-amber-500 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
