import { ROUTES } from "@/lib/constants/routes";

/**
 * Single-segment paths under the shell that are app routes, not `/{username}` profiles.
 * Keep in sync with `app/(shell)` static segments (excluding dynamic `[username]`).
 */
const RESERVED_USERNAME_SEGMENTS = new Set([
  "bookmarks",
  "discover",
  "drafts",
  "for-you",
  "new",
  "notifications",
  "settings",
  "title",
  "person",
  "profile",
]);

/** Inline to avoid Turbopack HMR stale exports from shared constants modules. */
const PROFILE_TAB_SEGMENT_SET = new Set(["diary", "lists", "stats"]);

/**
 * True when `pathname` is a profile route: `/{username}` or `/{username}/diary|lists|stats`.
 */
export function isUsernameProfilePath(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return false;
  if (RESERVED_USERNAME_SEGMENTS.has(parts[0])) return false;
  if (parts.length === 1) return true;
  if (parts.length === 2 && PROFILE_TAB_SEGMENT_SET.has(parts[1])) return true;
  return false;
}

/**
 * Shared route active-state matcher used by navigation UIs.
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (!pathname || !href) return false;

  if (href === ROUTES.HOME) {
    return pathname === ROUTES.HOME;
  }

  return pathname.startsWith(href);
}
