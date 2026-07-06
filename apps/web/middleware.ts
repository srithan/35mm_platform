import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.(?:avif|css|csv|docx?|gif|html?|ico|jpe?g|js|json|map|png|svg|ttf|txt|webmanifest|webp|woff2?|xlsx?|xml|zip)$/i;

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/forgot(.*)",
  "/reset(.*)",
  "/verify(.*)",
  "/about(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/help(.*)",
  "/careers(.*)",
  "/api/tmdb(.*)",
  "/api/notifications(.*)",
]);

const isGuestOnlyRoute = createRouteMatcher([
  "/login(.*)",
  "/signup(.*)",
  "/forgot(.*)",
  "/reset(.*)",
  "/verify(.*)",
]);

function isGuestOnlyPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/forgot" ||
    pathname.startsWith("/forgot/") ||
    pathname === "/reset" ||
    pathname.startsWith("/reset/") ||
    pathname === "/verify" ||
    pathname.startsWith("/verify/")
  );
}

function safeRedirectPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";

  try {
    const target = new URL(raw, "https://35mm.in");
    if (isGuestOnlyPath(target.pathname)) return "/";
    return target.pathname + target.search + target.hash;
  } catch {
    return "/";
  }
}

function isPublicAsset(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon/") ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    PUBLIC_FILE.test(pathname)
  );
}

export default clerkMiddleware(async function (auth, request) {
  const { pathname } = request.nextUrl;

  if (pathname === "/landing" || pathname.startsWith("/landing/")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublicAsset(request) && isGuestOnlyRoute(request)) {
    const { isAuthenticated } = await auth();
    if (isAuthenticated) {
      return NextResponse.redirect(
        new URL(safeRedirectPath(request.nextUrl.searchParams.get("next")), request.url)
      );
    }
  }

  if (!isPublicAsset(request) && !isPublicRoute(request)) {
    await auth.protect();
    return;
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
