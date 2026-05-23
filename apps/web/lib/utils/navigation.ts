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

/**
 * True when `pathname` is the profile index `/{username}` (not `/u/post/...` or app routes).
 */
export function isUsernameProfilePath(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 1) return false;
  return !RESERVED_USERNAME_SEGMENTS.has(parts[0]);
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
