import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.(?:avif|css|csv|docx?|gif|html?|ico|jpe?g|js|json|map|png|svg|ttf|txt|webmanifest|webp|woff2?|xlsx?|xml|zip)$/i;

const isPublicRoute = createRouteMatcher([
  "/",
  "/landing(.*)",
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

  if (!isPublicAsset(request) && !isPublicRoute(request)) {
    await auth.protect();
    return;
  }

  // Keep "/" as the signed-in app entry and "/landing" as the signed-out entry.
  // Redirect in middleware so users don't briefly render the wrong page.
  if (pathname === "/" || pathname.startsWith("/landing")) {
    const { userId } = await auth();

    if (pathname === "/" && !userId) {
      return NextResponse.redirect(new URL("/landing", request.url));
    }

    if (pathname.startsWith("/landing") && userId) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
