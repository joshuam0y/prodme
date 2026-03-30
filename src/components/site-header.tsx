import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";

const links = [
  { href: "/explore", label: "Discover" },
  { href: "/bundles", label: "Bundles" },
  { href: "/onboarding", label: "Build profile" },
] as const;

type Props = {
  user: User | null;
  supabaseEnabled: boolean;
};

export function SiteHeader({ user, supabaseEnabled }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--surface)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-semibold tracking-tight text-[var(--foreground)]"
        >
          prod<span className="text-[var(--accent)]">.me</span>
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-1 sm:gap-3">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100 sm:px-3"
            >
              {label}
            </Link>
          ))}
          {supabaseEnabled ? (
            user ? (
              <>
                <Link
                  href="/profile"
                  className="rounded-lg px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100 sm:px-3"
                >
                  Profile
                </Link>
                <form action={signOut} className="inline">
                  <button
                    type="submit"
                    className="rounded-lg px-2.5 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5 sm:px-3"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 sm:px-3"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-400 ring-1 ring-amber-500/30 transition hover:bg-amber-500/25"
                >
                  Sign up
                </Link>
              </>
            )
          ) : null}
        </nav>
      </div>
    </header>
  );
}
