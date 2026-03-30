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

  useEffect(() => {
    if (pathname === "/") return;
    // Email/OAuth links must finish on /auth/callback (PKCE, code in URL).
    if (pathname.startsWith("/auth")) return;
    if (!isReloadNavigation()) return;
    router.replace("/");
  }, [pathname, router]);

  return null;
}
