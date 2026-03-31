import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/env";

function safeNext(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/explore";
  }
  return path;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; notice?: string }>;
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
          Sign in
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Use the email and password you registered with.
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
              : error === "auth_callback"
                ? "That sign-in link could not be completed. If you already confirmed your email, sign in below. Otherwise request a fresh email link."
                : decodeURIComponent(error)}
          </p>
        ) : null}

        <form action={signIn} className="mt-8 space-y-4">
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
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
            <p className="mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-amber-500/90 hover:text-amber-400 hover:underline"
              >
                Forgot password?
              </Link>
            </p>
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-amber-500 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          No account?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="font-medium text-amber-500 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
