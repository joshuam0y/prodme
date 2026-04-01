import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { ProfileAvatar } from "@/components/profile-avatar";
import { isAdminEmail } from "@/lib/env";
import { MobileNavLink } from "@/components/mobile-nav-link";

const allNavLinks = [
  { href: "/explore", label: "Discover", shortLabel: "D" },
  { href: "/likes", label: "Likes", shortLabel: "L", authOnly: true },
  { href: "/matches", label: "Messages", shortLabel: "M", authOnly: true },
  { href: "/notifications", label: "Notifications", shortLabel: "N", authOnly: true },
  { href: "/bundles", label: "Bundles", shortLabel: "B" },
  { href: "/how-it-works", label: "How it works", shortLabel: "?" },
  { href: "/onboarding", label: "Profile", shortLabel: "P", hideWhenProfileComplete: true },
] as const;

type Props = {
  user: User | null;
  profileAvatarUrl?: string | null;
  supabaseEnabled: boolean;
  unreadMessages?: number;
  unreadNotifications?: number;
  /** When false, hide the Profile → onboarding link (user finished questionnaire). */
  showBuildProfileNav?: boolean;
};

export function SiteHeader({
  user,
  profileAvatarUrl = null,
  supabaseEnabled,
  unreadMessages = 0,
  unreadNotifications = 0,
  showBuildProfileNav = true,
}: Props) {
  const admin = isAdminEmail(user?.email);
  const links = (showBuildProfileNav
    ? allNavLinks
    : allNavLinks.filter(
        (l) => !("hideWhenProfileComplete" in l && l.hideWhenProfileComplete),
      )
  ).filter((l) => !("authOnly" in l && l.authOnly) || Boolean(user));

  const badgeForHref = (href: string) => {
    if (href === "/matches" && unreadMessages > 0) return unreadMessages > 9 ? "9+" : String(unreadMessages);
    if (href === "/notifications" && unreadNotifications > 0) {
      return unreadNotifications > 9 ? "9+" : String(unreadNotifications);
    }
    return null;
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--surface)]/80 backdrop-blur-md md:hidden">
        <div className="mx-auto max-w-5xl px-3 py-2 sm:flex sm:h-14 sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-0">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex shrink-0" aria-label="prodLink home">
              <Image
                src="/prodlink-logo-v2.svg"
                alt="prodLink"
                width={210}
                height={55}
                className="h-8 w-auto"
                priority
              />
            </Link>

            <details className="group relative">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-white/10 text-zinc-300 transition hover:bg-white/5 hover:text-zinc-100 [&::-webkit-details-marker]:hidden">
                <span className="text-lg leading-none group-open:hidden">≡</span>
                <span className="text-lg leading-none hidden group-open:inline">×</span>
              </summary>
              <div className="absolute right-0 mt-2 w-[min(86vw,300px)] rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur">
                <nav className="flex flex-col gap-1">
                  {links.map(({ href, label }) => {
                    const badge = badgeForHref(href);
                    return (
                      <MobileNavLink
                        key={href}
                        href={href}
                        className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-zinc-100"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {label}
                          {badge ? (
                            <span className="inline-flex min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-zinc-950">
                              {badge}
                            </span>
                          ) : null}
                        </span>
                      </MobileNavLink>
                    );
                  })}
                  {supabaseEnabled ? (
                    user ? (
                      <>
                        {admin ? (
                          <MobileNavLink
                            href="/admin/moderation"
                            className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-zinc-100"
                          >
                            Moderation
                          </MobileNavLink>
                        ) : null}
                        {!showBuildProfileNav ? (
                          <MobileNavLink
                            href="/profile"
                            className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-zinc-100"
                          >
                            <span className="inline-flex items-center gap-2">
                              <ProfileAvatar
                                name={user.email}
                                avatarUrl={profileAvatarUrl}
                                sizeClassName="h-6 w-6"
                                textClassName="text-[10px] font-semibold text-zinc-100"
                                ringClassName="border border-white/10 bg-zinc-800/60"
                              />
                              Profile
                            </span>
                          </MobileNavLink>
                        ) : null}
                        <form action={signOut}>
                          <button
                            type="submit"
                            className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-white/5 hover:text-zinc-100"
                          >
                            Sign out
                          </button>
                        </form>
                      </>
                    ) : (
                      <>
                        <MobileNavLink
                          href="/login"
                          className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-zinc-100"
                        >
                          Sign in
                        </MobileNavLink>
                        <MobileNavLink
                          href="/signup"
                          className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-400 ring-1 ring-amber-500/30 transition hover:bg-amber-500/25"
                        >
                          Sign up
                        </MobileNavLink>
                      </>
                    )
                  ) : null}
                </nav>
              </div>
            </details>
          </div>
        </div>
      </header>

      <aside className="hidden border-r border-white/10 bg-[var(--surface)]/85 md:sticky md:top-0 md:flex md:h-screen md:w-[88px] md:flex-col md:items-center md:justify-between md:px-3 md:py-5">
        <div className="flex w-full flex-col items-center gap-4">
          <Link href="/" className="inline-flex shrink-0" aria-label="prodLink home">
            <Image
              src="/prodlink-logo-v2.svg"
              alt="prodLink"
              width={44}
              height={44}
              className="h-11 w-11 rounded-2xl border border-white/10 bg-zinc-950/50 p-2"
              priority
            />
          </Link>
          <nav className="mt-4 flex w-full flex-col items-center gap-2">
            {links.map(({ href, label, shortLabel }) => {
              const badge = badgeForHref(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/35 text-sm font-semibold text-zinc-300 transition hover:border-amber-500/35 hover:bg-amber-500/10 hover:text-zinc-50"
                  aria-label={label}
                >
                  <span aria-hidden>{shortLabel}</span>
                  {badge ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-950">
                      {badge}
                    </span>
                  ) : null}
                  <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-zinc-950/95 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-100 opacity-0 shadow-xl transition group-hover:opacity-100">
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex w-full flex-col items-center gap-2">
          {supabaseEnabled ? (
            user ? (
              <>
                {admin ? (
                  <Link
                    href="/admin/moderation"
                    className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/35 text-sm font-semibold text-zinc-300 transition hover:border-amber-500/35 hover:bg-amber-500/10 hover:text-zinc-50"
                    aria-label="Moderation"
                  >
                    <span aria-hidden>Ad</span>
                    <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-zinc-950/95 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-100 opacity-0 shadow-xl transition group-hover:opacity-100">
                      Moderation
                    </span>
                  </Link>
                ) : null}
                {!showBuildProfileNav ? (
                  <Link
                    href="/profile"
                    className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/35 transition hover:border-amber-500/35 hover:bg-amber-500/10"
                    aria-label="Profile"
                  >
                    <ProfileAvatar
                      name={user.email}
                      avatarUrl={profileAvatarUrl}
                      sizeClassName="h-8 w-8"
                      textClassName="text-[10px] font-semibold text-zinc-100"
                      ringClassName="border border-white/10 bg-zinc-800/60"
                    />
                    <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-zinc-950/95 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-100 opacity-0 shadow-xl transition group-hover:opacity-100">
                      Profile
                    </span>
                  </Link>
                ) : null}
                <form action={signOut} className="relative">
                  <button
                    type="submit"
                    className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/35 text-sm font-semibold text-zinc-300 transition hover:border-amber-500/35 hover:bg-amber-500/10 hover:text-zinc-50"
                    aria-label="Sign out"
                  >
                    <span aria-hidden>→</span>
                    <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-zinc-950/95 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-100 opacity-0 shadow-xl transition group-hover:opacity-100">
                      Sign out
                    </span>
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/35 text-sm font-semibold text-zinc-300 transition hover:border-amber-500/35 hover:bg-amber-500/10 hover:text-zinc-50"
                  aria-label="Sign in"
                >
                  <span aria-hidden>In</span>
                  <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-zinc-950/95 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-100 opacity-0 shadow-xl transition group-hover:opacity-100">
                    Sign in
                  </span>
                </Link>
                <Link
                  href="/signup"
                  className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/25"
                  aria-label="Sign up"
                >
                  <span aria-hidden>Up</span>
                  <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-zinc-950/95 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-100 opacity-0 shadow-xl transition group-hover:opacity-100">
                    Sign up
                  </span>
                </Link>
              </>
            )
          ) : null}
        </div>
      </aside>
    </>
  );
}
