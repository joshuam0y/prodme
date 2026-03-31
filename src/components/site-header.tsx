import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";

const allNavLinks = [
  { href: "/explore", label: "Discover" },
  { href: "/likes", label: "Likes", authOnly: true },
  { href: "/matches", label: "Messages", authOnly: true },
  { href: "/saved", label: "Saved", authOnly: true },
  { href: "/bundles", label: "Bundles" },
  { href: "/onboarding", label: "Profile", hideWhenProfileComplete: true },
] as const;

type Props = {
  user: User | null;
  supabaseEnabled: boolean;
  unreadMessages?: number;
  /** When false, hide the Profile → onboarding link (user finished questionnaire). */
  showBuildProfileNav?: boolean;
};

export function SiteHeader({
  user,
  supabaseEnabled,
  unreadMessages = 0,
  showBuildProfileNav = true,
}: Props) {
  const links = (showBuildProfileNav
    ? allNavLinks
    : allNavLinks.filter(
        (l) => !("hideWhenProfileComplete" in l && l.hideWhenProfileComplete),
      )
  ).filter((l) => !("authOnly" in l && l.authOnly) || Boolean(user));

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--surface)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0"
          aria-label="prodLink home"
        >
          <Image
            src="/prodlink-logo.svg"
            alt="prodLink"
            width={210}
            height={55}
            className="h-8 w-auto sm:h-9"
            priority
          />
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-1 sm:gap-3">
          {links.map(({ href, label }) => {
            const isMessages = href === "/matches";
            return (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100 sm:px-3"
              >
                <span className="inline-flex items-center gap-1.5">
                  {label}
                  {isMessages && unreadMessages > 0 ? (
                    <span className="inline-flex min-w-[1rem] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-semibold text-zinc-950">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
          {supabaseEnabled ? (
            user ? (
              <>
                {!showBuildProfileNav ? (
                  <Link
                    href="/profile"
                    className="rounded-lg px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100 sm:px-3"
                  >
                    Profile
                  </Link>
                ) : null}
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
