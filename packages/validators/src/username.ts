import { z } from "zod";

export var usernameSchema = z
  .string()
  .min(2, { message: "Username must be at least 2 characters" })
  .max(30, { message: "Username must be 30 characters or fewer" })
  .regex(/^[a-zA-Z0-9._]+$/, {
    message: "Letters, numbers, dots and underscores only",
  })
  .transform(function (value) {
    return value.toLowerCase();
  });

export var RESERVED_USERNAMES = [
  "admin",
  "api",
  "help",
  "support",
  "about",
  "terms",
  "privacy",
  "settings",
  "notifications",
  "bookmarks",
  "contribute",
  "discover",
  "new",
  "login",
  "signup",
  "forgot",
  "reset",
  "verify",
  "onboarding",
  "landing",
] as const;

var RESERVED_USERNAME_SET = new Set<string>(RESERVED_USERNAMES);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAME_SET.has(username.toLowerCase().trim());
}
