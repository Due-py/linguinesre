// Runs before the auth-related pages: refreshes the Supabase session cookie and
// does a quick (optimistic) redirect. Real authorization happens again in the
// page / server action, close to the data.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const AUTH_PAGES = ["/dang-nhap", "/dang-ky"];

export async function proxy(request: NextRequest) {
  const env = getSupabasePublicEnv();
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        // Keeps CDNs from caching a response that carries someone's session.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!signedIn && pathname.startsWith("/hoc")) return redirectTo("/dang-nhap");
  if (signedIn && AUTH_PAGES.includes(pathname)) return redirectTo("/hoc");
  return response;
}

export const config = {
  matcher: ["/hoc/:path*", "/dang-nhap", "/dang-ky"],
};
