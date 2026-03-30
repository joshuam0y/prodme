"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

function isReloadNavigation(): boolean {
  if (typeof window === "undefined") return false;
  const nav = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}

export function RefreshToHome() {
  const router = useRouter();
  const pathname = usePathname();

  // Run once per full document load. `PerformanceNavigationTiming.type` stays
  // `"reload"` for the whole tab session after a refresh; re-running when
  // `pathname` changes would wrongly send every client navigation to `/`.
  useEffect(() => {
    if (pathname === "/") return;
    // Email/OAuth links must finish on /auth/callback (PKCE, code in URL).
    if (pathname.startsWith("/auth")) return;
    if (!isReloadNavigation()) return;
    router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only evaluate on mount
  }, []);

  return null;
}
