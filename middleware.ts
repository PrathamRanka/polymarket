import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PROTECTED_ROUTES = ["/portfolio", "/admin"];
const PUBLIC_AUTH_ROUTES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const userId = await verifySessionToken(sessionToken);

  const pathname = request.nextUrl.pathname;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isProtected && !userId) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/admin") && userId) {
    const supabase = getSupabaseAdminClient();
    const { data: profile } = await supabase
      .from("users")
      .select("rank,email")
      .eq("id", userId)
      .maybeSingle();

    const profileRow = profile as { rank: string; email: string } | null;

    const isAdmin =
      profileRow?.rank === "Legend" ||
      profileRow?.email === "admin@predictmarket.com" ||
      profileRow?.email === "pratham@gmail.com";

    if (!isAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/markets";
      return NextResponse.redirect(redirectUrl);
    }
  }

  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isPublicAuthRoute && userId) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/markets";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
