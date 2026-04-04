import Link from "next/link";

const linkClass =
  "text-xs text-zinc-500 transition hover:text-zinc-300 sm:text-sm";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[var(--background)]">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-10 sm:flex-row sm:justify-between sm:px-6">
        <p className="text-center text-xs text-zinc-600 sm:text-left">
          <span className="text-base font-semibold text-zinc-500 sm:text-lg">
            prodLink
          </span>
          <span className="mx-1.5 text-zinc-700">·</span>
          beta · nearby discovery for artists, producers, DJs &amp; venues
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end">
          <Link href="/explore" className={linkClass}>
            Discover
          </Link>
          <Link href="/bundles" className={linkClass}>
            Bundles
          </Link>
          <Link href="/help" className={linkClass}>
            Help
          </Link>
          <Link href="/login" className={linkClass}>
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
