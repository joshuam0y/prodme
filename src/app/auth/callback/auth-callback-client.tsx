"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { resolvePostAuthRedirect } from "@/lib/auth-callback-path";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function fullRedirect(path: string) {
  window.location.replace(
    `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`,
  );
}

/**
 * PKCE `?code=` is exchanged in middleware (cookies). This only handles hash
 * tokens (implicit) and “already have session” edge cases.
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    let cancelled = false;

    async function finish() {
      const hash =
        typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      const next = resolvePostAuthRedirect(searchParams, hash);

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
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search,
            );
            fullRedirect(next);
            return;
          }
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled && session) {
        fullRedirect(resolvePostAuthRedirect(searchParams, ""));
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
