/** Canonical site origin for metadata, OG URLs, auth redirectTo, etc. */
export function getSiteUrl(): URL {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (fromEnv) {
    try {
      return new URL(fromEnv.endsWith("/") ? fromEnv.slice(0, -1) : fromEnv);
    } catch {
      /* fall through */
    }
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  /* Match `npm run dev` (--hostname 127.0.0.1) so auth cookies and email links share one origin. */
  return new URL("http://127.0.0.1:3000");
}

/** String origin for `redirectTo`, signup links, etc. */
export function getSiteOrigin(): string {
  return getSiteUrl().origin;
}
