import { createMiddleware } from "hono/factory";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { users, profiles, userSettings } from "@35mm/db/schema";
import { getDb, getWriteDb } from "./db.js";
import { ApiError, unauthorized } from "./errors.js";
import { tryEnsureWatchlistForUser } from "./filmLists.js";
import { resolveProfileAvatarUrl } from "../modules/media/url.js";

export type AuthUser = {
  clerkUserId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarUrlLg?: string | null;
};

type AuthEnv = {
  Variables: {
    user: AuthUser;
  };
};

function isApiError(err: unknown): err is ApiError {
  return (
    err instanceof ApiError ||
    (err != null &&
      typeof err === "object" &&
      typeof (err as { status?: unknown }).status === "number" &&
      typeof (err as { code?: unknown }).code === "string" &&
      typeof (err as { message?: unknown }).message === "string")
  );
}

function displayNameForClerkUser(user: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}): string {
  var fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.username || "User";
}

function emailForClerkUser(user: {
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{ id: string; emailAddress: string }>;
}): string {
  var primary = user.emailAddresses.find(function (email) {
    return email.id === user.primaryEmailAddressId;
  });
  return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
}

async function ensureLocalUser(clerkUserId: string) {
  var db = getDb();
  var existing = await db
    .select({
      userId: users.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      status: users.status,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (existing.length > 0) {
    await tryEnsureWatchlistForUser(existing[0].userId);
    return {
      ...existing[0],
      avatarUrl: await resolveProfileAvatarUrl(existing[0].avatarUrl, existing[0].userId, existing[0].avatarVariants, "sm"),
      avatarUrlLg: await resolveProfileAvatarUrl(existing[0].avatarUrl, existing[0].userId, existing[0].avatarVariants, "lg"),
    };
  }

  var clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  var clerkUser = await clerk.users.getUser(clerkUserId);
  var username = (clerkUser.username || clerkUserId).toLowerCase();
  var displayName = displayNameForClerkUser(clerkUser);
  var email = emailForClerkUser(clerkUser);
  var userId = await getWriteDb().transaction(async function (tx) {
    var rows = await tx
      .insert(users)
      .values({
        clerkUserId: clerkUserId,
        email: email,
        ageVerifiedAt: new Date(),
        status: "active",
      })
      .returning({ id: users.id })
      .onConflictDoNothing();

    var localUserId = rows[0]?.id ?? null;
    if (!localUserId) {
      var existingUsers = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkUserId, clerkUserId))
        .limit(1);
      localUserId = existingUsers[0]?.id ?? null;
    }

    if (!localUserId) {
      return null;
    }

    var existingProfiles = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, localUserId))
      .limit(1);

    if (existingProfiles.length === 0) {
      var fallbackUsername = clerkUserId.toLowerCase();
      var stableUsername = "u" + localUserId.replace(/-/g, "").slice(0, 16);
      var usernameCandidates = Array.from(new Set([username, fallbackUsername, stableUsername]));

      for (var usernameCandidate of usernameCandidates) {
        var insertedProfile = await tx
          .insert(profiles)
          .values({
            userId: localUserId,
            username: usernameCandidate,
            displayName: displayName,
            avatarUrl: null,
            bio: null,
            coverUrl: null,
            location: null,
            website: null,
            role: null,
            roleContext: null,
          })
          .returning({ id: profiles.id })
          .onConflictDoNothing();

        if (insertedProfile.length > 0) break;
      }
    }

    await tx.insert(userSettings).values({ userId: localUserId }).onConflictDoNothing();

    return localUserId;
  });

  if (!userId) {
    throw unauthorized("User not found. Complete signup first.");
  }

  var created = await db
    .select({
      userId: users.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      status: users.status,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (created.length === 0) {
    throw unauthorized("User not found. Complete signup first.");
  }

  await tryEnsureWatchlistForUser(created[0].userId);

  return {
    ...created[0],
    avatarUrl: await resolveProfileAvatarUrl(created[0].avatarUrl, created[0].userId, created[0].avatarVariants, "sm"),
    avatarUrlLg: await resolveProfileAvatarUrl(created[0].avatarUrl, created[0].userId, created[0].avatarVariants, "lg"),
  };
}

async function verifyAndResolveUser(token: string): Promise<AuthUser | null> {
  var payload;
  try {
    payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
  } catch (_err) {
    return null;
  }

  var clerkUserId = payload.sub;
  if (!clerkUserId) return null;

  var row = await ensureLocalUser(clerkUserId);
  if (row.status === "deactivated" || row.status === "suspended") {
    return null;
  }

  return {
    clerkUserId,
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    avatarUrlLg: row.avatarUrlLg,
  };
}

export async function getOptionalAuthUser(
  authHeader: string | undefined
): Promise<AuthUser | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  var token = authHeader.slice(7);
  return verifyAndResolveUser(token);
}

export var requireAuth = createMiddleware<AuthEnv>(async function (c, next) {
  var authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw unauthorized("Missing or invalid Authorization header");
  }

  var token = authHeader.slice(7);
  var resolved = await verifyAndResolveUser(token);
  if (!resolved) {
    throw unauthorized("Invalid or expired token");
  }

  c.set("user", resolved);

  await next();
});

export var errorHandler = createMiddleware(async function (c, next) {
  try {
    await next();
  } catch (err) {
    if (isApiError(err)) {
      return c.json({ code: err.code, message: err.message }, err.status as 400);
    }
    console.error("Unhandled error:", err);
    return c.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong" },
      500
    );
  }
});
