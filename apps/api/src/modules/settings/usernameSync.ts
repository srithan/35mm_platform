import { createClerkClient } from "@clerk/backend";
import { isClerkAPIResponseError } from "@clerk/backend/errors";
import { and, eq, ne, or } from "drizzle-orm";
import { profiles, usernameLocks } from "@35mm/db/schema";
import { getWriteDb } from "../../lib/db.js";
import { ApiError, notFound, serviceUnavailable } from "../../lib/errors.js";

const PENDING_USERNAME_STALE_MS = 5 * 60 * 1000;

type ClerkUsernameClient = {
  getUser(userId: string): Promise<{ username: string | null }>;
  updateUser(userId: string, input: { username: string }): Promise<unknown>;
};

export type UsernameSyncDependencies = {
  createClerkUsernameClient?: (secretKey: string) => ClerkUsernameClient;
  now?: () => Date;
  usernameRequiresSync?: (userId: string, targetUsername: string) => Promise<boolean>;
  reservePendingUsername?: (input: {
    userId: string;
    targetUsername: string;
    clerkUsername: string | null;
    now: Date;
  }) => Promise<{ previousUsername: string; staleChangeFinalized: boolean }>;
  clearPendingUsername?: (
    userId: string,
    targetUsername: string,
    authStillSynced: boolean
  ) => Promise<void>;
  finalizePendingUsername?: (input: {
    userId: string;
    targetUsername: string;
    now: Date;
  }) => Promise<boolean>;
};

function isUniqueViolation(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  var typed = error as { code?: unknown; cause?: { code?: unknown } };
  return typed.code === "23505" || typed.cause?.code === "23505";
}

function clerkUsernameUnavailable(error: unknown): boolean {
  if (!isClerkAPIResponseError(error)) return false;
  if (error.status === 409 || error.status === 422) return true;
  return error.errors.some(function (item) {
    var code = item.code.toLowerCase();
    return (
      code.includes("identifier_exists") ||
      code.includes("identifier_already") ||
      code.includes("username_taken") ||
      code.includes("username_exists")
    );
  });
}

function usernameSyncUnavailable(message: string): ApiError {
  return serviceUnavailable("USERNAME_SYNC_UNAVAILABLE", message);
}

function usernameChangeInProgress(): ApiError {
  return new ApiError(
    409,
    "USERNAME_CHANGE_IN_PROGRESS",
    "A username change is already in progress. Please retry shortly."
  );
}

async function usernameRequiresSync(
  userId: string,
  targetUsername: string
): Promise<boolean> {
  var rows = await getWriteDb()
    .select({
      username: profiles.username,
      pendingUsername: profiles.pendingUsername,
      usernameAuthSyncedAt: profiles.usernameAuthSyncedAt,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (rows.length === 0) throw notFound("Profile not found");
  var row = rows[0];
  return !(
    row.username === targetUsername &&
    row.pendingUsername === null &&
    row.usernameAuthSyncedAt !== null
  );
}

async function reservePendingUsername(input: {
  userId: string;
  targetUsername: string;
  clerkUsername: string | null;
  now: Date;
}): Promise<{ previousUsername: string; staleChangeFinalized: boolean }> {
  try {
    return await getWriteDb().transaction(async function (tx) {
      var rows = await tx
        .select({
          username: profiles.username,
          pendingUsername: profiles.pendingUsername,
          pendingUsernameRequestedAt: profiles.pendingUsernameRequestedAt,
        })
        .from(profiles)
        .where(eq(profiles.userId, input.userId))
        .limit(1)
        .for("update");

      if (rows.length === 0) throw notFound("Profile not found");

      var row = rows[0];
      var currentUsername = row.username;
      var staleChangeFinalized = false;

      if (row.pendingUsername) {
        var requestedAt = row.pendingUsernameRequestedAt?.getTime() ?? input.now.getTime();
        var isStale = requestedAt <= input.now.getTime() - PENDING_USERNAME_STALE_MS;
        if (!isStale) throw usernameChangeInProgress();

        if (input.clerkUsername === row.pendingUsername) {
          currentUsername = row.pendingUsername;
          staleChangeFinalized = true;
        }

        await tx
          .update(profiles)
          .set({
            username: currentUsername,
            usernameAuthSyncedAt:
              input.clerkUsername === currentUsername ? input.now : null,
            pendingUsername: null,
            pendingUsernameRequestedAt: null,
            updatedAt: input.now,
          })
          .where(eq(profiles.userId, input.userId));
      }

      var [conflictingProfiles, lockedUsernames] = await Promise.all([
        tx
          .select({ userId: profiles.userId })
          .from(profiles)
          .where(
            and(
              ne(profiles.userId, input.userId),
              or(
                eq(profiles.username, input.targetUsername),
                eq(profiles.pendingUsername, input.targetUsername)
              )
            )
          )
          .limit(1),
        tx
          .select({ username: usernameLocks.username })
          .from(usernameLocks)
          .where(eq(usernameLocks.username, input.targetUsername))
          .limit(1),
      ]);

      if (lockedUsernames.length > 0) {
        throw new ApiError(409, "USERNAME_RESERVED", "Username is reserved");
      }
      if (conflictingProfiles.length > 0) {
        throw new ApiError(409, "USERNAME_TAKEN", "Username is already taken");
      }

      await tx
        .update(profiles)
        .set({
          usernameAuthSyncedAt: null,
          pendingUsername: input.targetUsername,
          pendingUsernameRequestedAt: input.now,
          updatedAt: input.now,
        })
        .where(eq(profiles.userId, input.userId));

      return {
        previousUsername: currentUsername,
        staleChangeFinalized,
      };
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "USERNAME_TAKEN", "Username is already taken");
    }
    throw error;
  }
}

async function clearPendingUsername(
  userId: string,
  targetUsername: string,
  authStillSynced: boolean
): Promise<void> {
  await getWriteDb()
    .update(profiles)
    .set({
      pendingUsername: null,
      pendingUsernameRequestedAt: null,
      usernameAuthSyncedAt: authStillSynced ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(profiles.userId, userId),
        eq(profiles.pendingUsername, targetUsername)
      )
    );
}

async function finalizePendingUsername(input: {
  userId: string;
  targetUsername: string;
  now: Date;
}): Promise<boolean> {
  try {
    return await getWriteDb().transaction(async function (tx) {
      var rows = await tx
        .select({
          username: profiles.username,
          pendingUsername: profiles.pendingUsername,
        })
        .from(profiles)
        .where(eq(profiles.userId, input.userId))
        .limit(1)
        .for("update");

      if (rows.length === 0) throw notFound("Profile not found");
      var row = rows[0];
      if (row.username === input.targetUsername && row.pendingUsername === null) {
        return false;
      }
      if (row.pendingUsername !== input.targetUsername) {
        throw usernameSyncUnavailable(
          "Username synchronization state changed. Please retry."
        );
      }

      await tx
        .update(profiles)
        .set({
          username: input.targetUsername,
          usernameAuthSyncedAt: input.now,
          pendingUsername: null,
          pendingUsernameRequestedAt: null,
          updatedAt: input.now,
        })
        .where(eq(profiles.userId, input.userId));
      return true;
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "USERNAME_TAKEN", "Username is already taken");
    }
    throw error;
  }
}

export async function synchronizeUsername(input: {
  userId: string;
  clerkUserId: string;
  clerkSecretKey: string | undefined;
  targetUsername: string;
  clerkAuthSource?: string;
  dependencies?: UsernameSyncDependencies;
}): Promise<{ changed: boolean }> {
  if (!input.clerkSecretKey) {
    throw usernameSyncUnavailable(
      "Username changes are unavailable for this authenticated session."
    );
  }

  var requiresSync =
    input.dependencies?.usernameRequiresSync ?? usernameRequiresSync;
  if (!(await requiresSync(input.userId, input.targetUsername))) {
    return { changed: false };
  }

  var createClient =
    input.dependencies?.createClerkUsernameClient ??
    function (secretKey: string) {
      return createClerkClient({ secretKey }).users;
    };
  var now = input.dependencies?.now?.() ?? new Date();
  var reserve = input.dependencies?.reservePendingUsername ?? reservePendingUsername;
  var clear = input.dependencies?.clearPendingUsername ?? clearPendingUsername;
  var finalize = input.dependencies?.finalizePendingUsername ?? finalizePendingUsername;
  var clerk = createClient(input.clerkSecretKey);
  var clerkUser;

  try {
    clerkUser = await clerk.getUser(input.clerkUserId);
  } catch (error) {
    console.error("[username-sync] clerk-read-failed", {
      clerkUserId: input.clerkUserId,
      clerkAuthSource: input.clerkAuthSource,
      message: error instanceof Error ? error.message : String(error),
    });
    throw usernameSyncUnavailable(
      "Unable to verify username with the authentication service. Please retry."
    );
  }

  var clerkUsername = clerkUser.username?.trim().toLowerCase() ?? null;
  var reservation = await reserve({
    userId: input.userId,
    targetUsername: input.targetUsername,
    clerkUsername,
    now,
  });

  if (clerkUsername !== input.targetUsername) {
    try {
      await clerk.updateUser(input.clerkUserId, {
        username: input.targetUsername,
      });
    } catch (error) {
      var confirmedClerkUsername: string | null = null;
      try {
        var confirmedClerkUser = await clerk.getUser(input.clerkUserId);
        confirmedClerkUsername =
          confirmedClerkUser.username?.trim().toLowerCase() ?? null;
      } catch (confirmationError) {
        console.error("[username-sync] clerk-write-outcome-unknown", {
          clerkUserId: input.clerkUserId,
          clerkAuthSource: input.clerkAuthSource,
          targetUsername: input.targetUsername,
          writeMessage: error instanceof Error ? error.message : String(error),
          confirmationMessage:
            confirmationError instanceof Error
              ? confirmationError.message
              : String(confirmationError),
        });
        throw serviceUnavailable(
          "USERNAME_SYNC_PENDING",
          "Username synchronization is pending confirmation. Please retry shortly."
        );
      }

      if (confirmedClerkUsername === input.targetUsername) {
        clerkUsername = confirmedClerkUsername;
      } else {
        try {
          await clear(
            input.userId,
            input.targetUsername,
            confirmedClerkUsername === reservation.previousUsername
          );
        } catch (clearError) {
          console.error("[username-sync] reservation-clear-failed", {
            userId: input.userId,
            targetUsername: input.targetUsername,
            message: clearError instanceof Error ? clearError.message : String(clearError),
          });
        }

        if (clerkUsernameUnavailable(error)) {
          throw new ApiError(
            409,
            "USERNAME_TAKEN",
            "Username is unavailable for sign-in"
          );
        }

        console.error("[username-sync] clerk-write-failed", {
          clerkUserId: input.clerkUserId,
          clerkAuthSource: input.clerkAuthSource,
          targetUsername: input.targetUsername,
          message: error instanceof Error ? error.message : String(error),
        });
        throw usernameSyncUnavailable(
          "Unable to update sign-in username. No profile change was saved."
        );
      }
    }
  }

  try {
    var finalized = await finalize({
      userId: input.userId,
      targetUsername: input.targetUsername,
      now,
    });
    return {
      changed:
        finalized ||
        reservation.staleChangeFinalized ||
        reservation.previousUsername !== input.targetUsername ||
        clerkUsername !== input.targetUsername,
    };
  } catch (error) {
    console.error("[username-sync] database-finalize-failed", {
      userId: input.userId,
      clerkUserId: input.clerkUserId,
      targetUsername: input.targetUsername,
      message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof ApiError && error.status === 409) throw error;
    throw serviceUnavailable(
      "USERNAME_SYNC_PENDING",
      "Sign-in username changed and profile synchronization is pending. Please retry shortly."
    );
  }
}

export async function finalizeUsernameFromClerkWebhook(input: {
  userId: string;
  clerkUsername: string;
  now?: Date;
}): Promise<"finalized" | "already_current" | "ignored"> {
  var db = getWriteDb();
  return db.transaction(async function (tx) {
    var rows = await tx
      .select({
        username: profiles.username,
        pendingUsername: profiles.pendingUsername,
      })
      .from(profiles)
      .where(eq(profiles.userId, input.userId))
      .limit(1)
      .for("update");

    if (rows.length === 0) return "ignored";
    var row = rows[0];
    if (row.username === input.clerkUsername && row.pendingUsername === null) {
      return "already_current";
    }
    if (row.pendingUsername !== input.clerkUsername) {
      await tx
        .update(profiles)
        .set({
          usernameAuthSyncedAt: null,
          updatedAt: input.now ?? new Date(),
        })
        .where(eq(profiles.userId, input.userId));
      return "ignored";
    }

    await tx
      .update(profiles)
      .set({
        username: input.clerkUsername,
        usernameAuthSyncedAt: input.now ?? new Date(),
        pendingUsername: null,
        pendingUsernameRequestedAt: null,
        updatedAt: input.now ?? new Date(),
      })
      .where(eq(profiles.userId, input.userId));
    return "finalized";
  });
}
