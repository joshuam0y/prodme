import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolvePostAuthRedirect } from "@/lib/auth-callback-path";

export async function middleware(request: NextRequest) {
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

      const login = new URL("/login", request.url);
      let errMsg = error.message || "Could not verify auth link";
      if (/verifier|pkce|storage/i.test(errMsg)) {
        errMsg = `${errMsg} Use the same browser where you asked for the email, or request a new confirmation or reset link.`;
      } else if (/expired|invalid|already|consumed|used/i.test(errMsg)) {
        errMsg =
          "This link was already used or expired. Confirmation links only work once — try signing in, or sign up again for a new email.";
      }
      login.searchParams.set("error", errMsg);
      return NextResponse.redirect(login);
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
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
