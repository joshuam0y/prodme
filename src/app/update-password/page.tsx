import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePassword } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/?error=supabase");
  }

  const params = await searchParams;
  const error = params.error;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 text-center shadow-xl">
          <h1 className="text-xl font-semibold text-zinc-100">
            Link expired or invalid
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Open the reset link from your email again, or request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
          >
            Request new link
          </Link>
          <p className="mt-4">
            <Link href="/login" className="text-sm text-amber-500 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          New password
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Signed in as {user.email}. Choose a strong password you haven&apos;t
          used here before.
        </p>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error === "not_configured"
              ? "Supabase is not configured."
              : error === "short"
                ? "Password must be at least 8 characters."
                : error === "mismatch"
                  ? "Passwords do not match."
                  : decodeURIComponent(error)}
          </p>
        ) : null}

        <form action={updatePassword} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="password"
              className="text-xs font-medium text-zinc-500"
            >
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="text-xs font-medium text-zinc-500"
            >
              Confirm password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-amber-500 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            Update password
          </button>
        </form>
      </div>
    </main>
  );
}
