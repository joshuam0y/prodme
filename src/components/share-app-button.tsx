"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  className?: string;
  idleLabel?: string;
  copiedLabel?: string;
};

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/.test(ua);
}

export function ShareAppButton({
  className = "",
  idleLabel = "Share ProdLink",
  copiedLabel = "Copied invite link",
}: Props) {
  const [label, setLabel] = useState(idleLabel);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  function showFeedback(nextLabel: string, message: string) {
    setLabel(nextLabel);
    setToastMessage(message);
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setLabel(idleLabel);
      setToastMessage(null);
    }, 1800);
  }

  async function copyInviteLink(url: string) {
    const inviteText = `Try ProdLink - discover music collaborators, venues, and opportunities.\n${url}`;
    await navigator.clipboard.writeText(inviteText);
    showFeedback(copiedLabel, "Invite link copied to clipboard");
  }

  async function onShare() {
    const url =
      typeof window === "undefined"
        ? "/"
        : new URL("/signup", window.location.origin).toString();

    try {
      await copyInviteLink(url);

      if (isMobileDevice()) return;

      if (navigator.share) {
        try {
          await navigator.share({
            title: "ProdLink",
            text: "Try ProdLink - discover music collaborators, venues, and opportunities.",
            url,
          });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          throw error;
        }
      }
    } catch {
      showFeedback("Could not copy link", "Could not copy invite link");
    }
  }

  return (
    <>
      <button type="button" onClick={onShare} className={className}>
        {label}
      </button>
      {toastMessage ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex justify-center px-4">
          <div
            aria-live="polite"
            className="rounded-full border border-white/10 bg-zinc-950/95 px-4 py-2 text-sm text-zinc-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
          >
            {toastMessage}
          </div>
        </div>
      ) : null}
    </>
  );
}
