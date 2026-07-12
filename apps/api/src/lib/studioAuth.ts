import { createClerkClient } from "@clerk/backend";
import type { AuthUser } from "./middleware.js";

export type StudioRole =
  | "owner"
  | "admin"
  | "catalog"
  | "moderation"
  | "moderation_admin"
  | "systems"
  | "viewer";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeStudioRole(value: unknown): StudioRole {
  if (typeof value !== "string") return "viewer";
  var role = value.toLowerCase().replace(/^org:/, "").replace(/^studio:/, "");
  if (role === "owner" || role === "super_admin") return "owner";
  if (role === "admin") return "admin";
  if (role === "catalog" || role === "catalog_admin" || role === "catalog_editor") return "catalog";
  if (role === "moderation_admin" || role === "moderator_admin" || role === "trust_safety_admin") {
    return "moderation_admin";
  }
  if (role === "moderation" || role === "moderator" || role === "trust_safety") return "moderation";
  if (role === "systems" || role === "system" || role === "ops" || role === "infrastructure") return "systems";
  return "viewer";
}

export function roleCanWriteCatalog(role: StudioRole): boolean {
  return role === "owner" || role === "admin" || role === "catalog";
}

export function roleCanModerate(role: StudioRole): boolean {
  return role === "owner" || role === "admin" || role === "moderation" || role === "moderation_admin";
}

export function roleCanReverseModeration(role: StudioRole): boolean {
  return role === "owner" || role === "admin" || role === "moderation_admin";
}

function configuredClerkSecretKeys(user: AuthUser): Array<{ key: string; source: string }> {
  var seen = new Set<string>();
  var entries = [
    { key: user.clerkSecretKey, source: user.clerkAuthSource ?? "verified" },
    { key: process.env.STUDIO_CLERK_SECRET_KEY, source: "studio" },
    { key: process.env.CLERK_STUDIO_SECRET_KEY, source: "studio_legacy" },
    { key: process.env.CLERK_SECRET_KEY, source: "platform" },
    ...(process.env.CLERK_SECRET_KEYS ?? "").split(",").map(function (key, index) {
      return { key, source: "configured_" + index };
    }),
  ];
  return entries
    .map(function (entry) {
      return { key: entry.key?.trim() ?? "", source: entry.source };
    })
    .filter(function (entry) {
      if (!entry.key || seen.has(entry.key)) return false;
      seen.add(entry.key);
      return true;
    });
}

function roleFromMetadata(
  publicMetadata: Record<string, unknown>,
  unsafeMetadata: Record<string, unknown>
): StudioRole {
  return normalizeStudioRole(
    publicMetadata.studioRole ??
      publicMetadata.role ??
      unsafeMetadata.studioRole ??
      unsafeMetadata.role
  );
}

export function studioRoleFromAuthUserMetadata(user: AuthUser): StudioRole {
  return roleFromMetadata(
    isRecord(user.publicMetadata) ? user.publicMetadata : {},
    isRecord(user.unsafeMetadata) ? user.unsafeMetadata : {}
  );
}

function logStudioAuth(
  namespace: string,
  user: AuthUser,
  role: StudioRole,
  publicMetadata: Record<string, unknown>,
  unsafeMetadata: Record<string, unknown>,
  source: "token" | "clerk"
): void {
  if (process.env.NODE_ENV === "production") return;
  console.info("[" + namespace + "]", {
    authSource: user.clerkAuthSource ?? "unknown",
    role,
    source,
    hasPublicStudioRole: typeof publicMetadata.studioRole === "string",
    hasUnsafeStudioRole: typeof unsafeMetadata.studioRole === "string",
  });
}

export async function studioRoleForUser(
  user: AuthUser,
  namespace = "studio.auth",
  acceptTokenRole: (role: StudioRole) => boolean = function (role) {
    return role !== "viewer";
  }
): Promise<StudioRole> {
  var tokenPublicMetadata = isRecord(user.publicMetadata) ? user.publicMetadata : {};
  var tokenUnsafeMetadata = isRecord(user.unsafeMetadata) ? user.unsafeMetadata : {};
  var tokenRole = roleFromMetadata(tokenPublicMetadata, tokenUnsafeMetadata);
  if (acceptTokenRole(tokenRole)) {
    logStudioAuth(namespace, user, tokenRole, tokenPublicMetadata, tokenUnsafeMetadata, "token");
    return tokenRole;
  }

  var lastError: unknown;
  for (var secret of configuredClerkSecretKeys(user)) {
    var clerk = createClerkClient({ secretKey: secret.key });
    try {
      var clerkUser = await clerk.users.getUser(user.clerkUserId);
      var publicMetadata = isRecord(clerkUser.publicMetadata) ? clerkUser.publicMetadata : {};
      var unsafeMetadata = isRecord(clerkUser.unsafeMetadata) ? clerkUser.unsafeMetadata : {};
      var role = roleFromMetadata(publicMetadata, unsafeMetadata);
      logStudioAuth(namespace, user, role, publicMetadata, unsafeMetadata, "clerk");
      return role;
    } catch (error) {
      lastError = error;
    }
  }

  console.warn("[" + namespace + "] clerk user metadata lookup failed", {
    authSource: user.clerkAuthSource ?? "unknown",
    clerkUserId: user.clerkUserId,
    error: lastError,
  });
  logStudioAuth(namespace, user, tokenRole, tokenPublicMetadata, tokenUnsafeMetadata, "token");
  return tokenRole;
}
