import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_ROUTES = ["/dashboard", "/onboarding", "/admin"];
const AUTH_ROUTES = ["/login", "/register"];
const SETUP_ROUTES = ["/setup", "/api/setup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── First-run mode: no Supabase configured ──
  // NEXT_PUBLIC_SUPABASE_URL is inlined at build time.
  // If empty, the app is in first-run mode — only /setup and /api/setup are accessible.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Allow setup routes through
    if (SETUP_ROUTES.some((route) => pathname.startsWith(route))) {
      return NextResponse.next();
    }
    // Everything else redirects to /setup
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  // ── Supabase is configured — refresh session ──
  const response = await updateSession(request);

  // Allow setup API routes through (they self-guard via isSetupComplete)
  if (pathname.startsWith("/api/setup")) {
    return response;
  }

  // ── Protected routes: require auth ──
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const hasAuthCookie = request.cookies
      .getAll()
      .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"));

    if (!hasAuthCookie) {
      // Admin setup is a special case — redirect to login with next=/admin/setup
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  // ── Auth routes: redirect to dashboard if already logged in ──
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const hasAuthCookie = request.cookies
      .getAll()
      .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"));

    if (hasAuthCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/v1).*)",
  ],
};
