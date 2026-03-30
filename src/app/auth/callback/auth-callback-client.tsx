"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function safeNext(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/explore";
  }
  return path;
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const next = safeNext(searchParams.get("next"));
    const supabase = createBrowserSupabaseClient();

    let cancelled = false;

    async function finish() {
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && !error) {
          router.replace(next);
          return;
        }
        if (error && !cancelled) {
          setMessage("Could not verify link. Try requesting a new one.");
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
      }

      const hash =
        typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (!cancelled && !error) {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
            router.replace(next);
            return;
          }
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled && session) {
        router.replace(next);
        return;
      }

      if (!cancelled) {
        setMessage("Redirecting…");
        router.replace("/login?error=auth_callback");
      }
    }

    void finish();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-4">
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  );
}
