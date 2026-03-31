import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolvePostAuthRedirect } from "@/lib/auth-callback-path";

function authErrorPath(url: URL): "/signup" | "/login" {
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");
  if (type === "signup" || next === "/onboarding") return "/signup";
  return "/login";
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;

  /** PKCE: verifier lives in cookies from the server request that started the flow — exchange here, not in the browser. */
  if (url.pathname === "/auth/callback") {
    const code = url.searchParams.get("code");
    if (code) {
      const nextPath = resolvePostAuthRedirect(url.searchParams);
      const redirectResponse = NextResponse.redirect(new URL(nextPath, request.url));

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                redirectResponse.cookies.set(name, value, options);
              });
            },
          },
        },
      );

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return redirectResponse;
      }

      const fallback = new URL(authErrorPath(url), request.url);
      let errMsg = error.message || "Could not verify auth link";
      if (/verifier|pkce|storage/i.test(errMsg)) {
        errMsg =
          authErrorPath(url) === "/signup"
            ? "We couldn't finish sign-up from that email link in this browser. Open the newest confirmation email in the same browser where you signed up, or request a fresh confirmation link."
            : `${errMsg} Use the same browser where you asked for the email, or request a new confirmation or reset link.`;
      } else if (/expired|invalid|already|consumed|used/i.test(errMsg)) {
        errMsg =
          authErrorPath(url) === "/signup"
            ? "That confirmation link was already used or expired. Request a fresh confirmation email below."
            : "This link was already used or expired. Confirmation links only work once — try signing in, or request a new email.";
      }
      fallback.searchParams.set("error", errMsg);
      return NextResponse.redirect(fallback);
    }
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
