import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function safeNext(path: string | null, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}

function fallbackPathForType(type: string | null): string {
  if (type === "recovery") return "/update-password";
  if (type === "email" || type === "signup" || type === "invite") return "/onboarding";
  if (type === "email_change") return "/profile";
  return "/explore";
}

function errorPathForType(type: string | null): "/signup" | "/login" | "/forgot-password" | "/profile" {
  if (type === "email" || type === "signup" || type === "invite") return "/signup";
  if (type === "recovery") return "/forgot-password";
  if (type === "email_change") return "/profile";
  return "/login";
}

function errorMessageForType(type: string | null): string {
  if (type === "email" || type === "signup" || type === "invite") {
    return "That confirmation link was invalid or expired. Request a fresh confirmation email.";
  }
  if (type === "recovery") {
    return "That password reset link was invalid or expired. Request a fresh reset email.";
  }
  if (type === "email_change") {
    return "That email change link was invalid or expired. Request a new email change confirmation.";
  }
  return "That sign-in link was invalid or expired. Request a fresh email link.";
}

function successPathForType(origin: string, type: string | null, next: string): URL {
  if (type === "email" || type === "signup" || type === "invite" || type === "email_change") {
    const url = new URL("/auth/confirmed", origin);
    url.searchParams.set("next", next);
    url.searchParams.set(
      "kind",
      type === "email_change" ? "email_change" : type === "invite" ? "invite" : "signup",
    );
    return url;
  }
  return new URL(next, origin);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"), fallbackPathForType(type));

  if (!token_hash || !type) {
    const errorUrl = new URL(errorPathForType(type), url.origin);
    errorUrl.searchParams.set("error", errorMessageForType(type));
    return NextResponse.redirect(errorUrl);
  }

  const redirectResponse = NextResponse.redirect(successPathForType(url.origin, type, next));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as EmailOtpType,
  });

  if (!error) {
    return redirectResponse;
  }

  const errorUrl = new URL(errorPathForType(type), url.origin);
  errorUrl.searchParams.set("error", errorMessageForType(type));
  return NextResponse.redirect(errorUrl);
}
