"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { resolvePostAuthRedirect } from "@/lib/auth-callback-path";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const LINK_USED_HINT =
  "That email link was already used or expired. If you already confirmed your account, sign in. Otherwise request a fresh confirmation email.";

function fullRedirect(path: string) {
  window.location.replace(
    `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`,
  );
}

function authErrorPath(searchParams: URLSearchParams, hashWithoutLeading: string): "/signup" | "/login" {
  const type = searchParams.get("type");
  const next = searchParams.get("next");
  if (type === "signup" || next === "/onboarding") return "/signup";
  if (hashWithoutLeading) {
    const hashParams = new URLSearchParams(hashWithoutLeading);
    const hashType = hashParams.get("type");
    if (
      hashType === "signup" ||
      hashType === "email" ||
      hashType === "invite" ||
      hashType === "email_change"
    ) {
      return "/signup";
    }
  }
  return "/login";
}

function redirectWithError(
  router: ReturnType<typeof useRouter>,
  searchParams: URLSearchParams,
  hashWithoutLeading: string,
  message: string,
) {
  router.replace(`${authErrorPath(searchParams, hashWithoutLeading)}?error=${encodeURIComponent(message)}`);
}

/**
 * PKCE `?code=` is exchanged in middleware (cookies). This handles hash tokens
 * (implicit), leftover query `code` fallbacks, and clear errors for used/expired links.
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
      const hashParams = hash ? new URLSearchParams(hash) : null;

      const fragErr =
        hashParams?.get("error_description")?.trim() ||
        hashParams?.get("error")?.trim();
      if (fragErr) {
        redirectWithError(router, searchParams, hash, fragErr);
        return;
      }

      const qErr =
        searchParams.get("error_description")?.trim() ||
        searchParams.get("error")?.trim();
      if (qErr) {
        redirectWithError(router, searchParams, hash, qErr);
        return;
      }

      const next = resolvePostAuthRedirect(searchParams, hash);

      if (hashParams) {
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
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
          if (!cancelled && error) {
            const msg =
              /expired|invalid|already|consumed|used/i.test(error.message)
                ? LINK_USED_HINT
                : error.message;
            redirectWithError(router, searchParams, hash, msg);
            return;
          }
        }
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && !error) {
          fullRedirect(resolvePostAuthRedirect(searchParams, ""));
          return;
        }
        if (!cancelled && error) {
          const msg =
            /verifier|pkce|storage/i.test(error.message)
              ? authErrorPath(searchParams, hash) === "/signup"
                ? "We couldn't finish sign-up from that email link in this browser. Open the newest confirmation email in the same browser where you signed up, or request a fresh confirmation link."
                : `${error.message} Try opening the link in the same browser where you started sign-in, or request a fresh email.`
              : /expired|invalid|already/i.test(error.message)
                ? LINK_USED_HINT
                : error.message;
          redirectWithError(router, searchParams, hash, msg);
          return;
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
        redirectWithError(
          router,
          searchParams,
          hash,
          "We couldn't finish signing you in from this link. If you already confirmed your email, try signing in.",
        );
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
