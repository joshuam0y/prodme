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
      let redirectResponse = NextResponse.redirect(new URL(nextPath, request.url));

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
      login.searchParams.set(
        "error",
        error.message || "Could not verify auth link",
      );
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
