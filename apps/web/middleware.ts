import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isPersonRoleSlug } from "@/lib/routing/personRoles";

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
  "/waitlist(.*)",
  "/api/tmdb(.*)",
  "/api/notifications(.*)",
]);

/**
 * Top-level path segments that must stay behind auth. Everything else that is
 * not an explicit auth/static route is treated as a public content page
 * (profiles, titles, people, lists, posts) so signed-out visitors can browse.
 */
const PROTECTED_SECTIONS = new Set([
  "bookmarks",
  "chat",
  "communities",
  "contribute",
  "drafts",
  "festivals",
  "new",
  "notifications",
  "onboarding",
  "settings",
  "suggestions",
  "70mm",
]);

/**
 * First segments already handled by `isPublicRoute`/`isGuestOnlyRoute` or by
 * Next internals. They are never username profiles, so exclude them from the
 * profile fallback below.
 */
const NON_PROFILE_SECTIONS = new Set([
  "about",
  "api",
  "careers",
  "forgot",
  "help",
  "login",
  "privacy",
  "reset",
  "signup",
  "terms",
  "verify",
  "waitlist",
]);

/** Catalog/content prefixes that are fully public regardless of auth. */
const PUBLIC_CONTENT_SECTIONS = new Set([
  "company",
  "discover",
  "film",
  "films",
  "list",
  "lists",
  "person",
  "title",
  "tv",
]);

/**
 * Public content pages: profiles, post detail, titles, people, lists, discover.
 * Kept in sync with the app router so signed-out visitors can read these pages
 * while app sections (feed, chat, settings, etc.) stay protected.
 */
function isPublicContentPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return true;

  const first = segments[0];

  if (PUBLIC_CONTENT_SECTIONS.has(first)) return true;

  // Role-scoped person pages, e.g. /director/christopher-nolan.
  if (segments.length === 2 && isPersonRoleSlug(first)) return true;

  if (PROTECTED_SECTIONS.has(first) || NON_PROFILE_SECTIONS.has(first)) {
    return false;
  }

  // /:username profile.
  if (segments.length === 1) return true;

  // /:username/reposts|diary|lists|stats profile tabs.
  if (
    segments.length === 2 &&
    (segments[1] === "reposts" ||
      segments[1] === "diary" ||
      segments[1] === "lists" ||
      segments[1] === "stats")
  ) {
    return true;
  }

  // /:username/post/:postId and nested (e.g. /quotes).
  if (segments.length >= 3 && segments[1] === "post") return true;

  return false;
}

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

  if (
    !isPublicAsset(request) &&
    !isPublicRoute(request) &&
    !isPublicContentPath(pathname)
  ) {
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
