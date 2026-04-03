"use client";

import { useEffect, useRef } from "react";
import { touchLastSeen } from "@/app/profile/last-seen-actions";

const INTERVAL_MS = 3 * 60 * 1000;

/**
 * While signed in, periodically records app activity for "Last seen" on profiles.
 */
export function LastSeenHeartbeat() {
  const lastPing = useRef(0);

  useEffect(() => {
    const ping = () => {
      const now = Date.now();
      if (now - lastPing.current < 15_000) return;
      lastPing.current = now;
      void touchLastSeen();
    };

    ping();

    const id = window.setInterval(ping, INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
