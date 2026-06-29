import { eq, inArray, sql } from "drizzle-orm";
import { Rest } from "ably";
import { createDb, notifications, profiles } from "@35mm/db";
import { loadWorkerEnv } from "../lib/env.js";
import { sendNotificationEmail } from "./notificationEmail.js";

type NotificationPublishJobPayload = {
  notificationId: string;
};

type ActorProfile = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

function normalizeActorIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(function (candidate): candidate is string {
      return typeof candidate === "string" && candidate.length > 0;
    });
  }

  if (typeof value === "string") {
    var trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed[0] === "{" && trimmed[trimmed.length - 1] === "}") {
      if (trimmed.length <= 2) return [];

      return trimmed
        .slice(1, -1)
        .split(",")
        .map(function (part) {
          return part.trim().replace(/^"(.*)"$/s, "$1");
        })
        .filter(function (part) {
          return part.length > 0;
        });
    }

    try {
      var parsed = JSON.parse(trimmed);
      return normalizeActorIds(parsed);
    } catch (_error) {
      return [];
    }
  }

  return [];
}

function isMissingActorIdsColumnError(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;

  var candidate = err as {
    code?: unknown;
    message?: unknown;
    cause?: {
      code?: unknown;
      message?: unknown;
    };
  };

  var code = typeof candidate.code === "string" ? candidate.code : "";
  if (code === "42703") return true;

  var cause = candidate.cause;
  var causeCode = cause && typeof cause === "object" ? (cause.code as unknown) : "";
  if (typeof causeCode === "string" && causeCode === "42703") return true;

  var message = typeof candidate.message === "string" ? candidate.message : "";
  var causeMessage =
    cause && typeof cause === "object" && typeof cause.message === "string" ? cause.message : "";

  return (
    message.includes("actor_ids") ||
    causeMessage.includes("actor_ids") ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

let db = null as ReturnType<typeof createDb> | null;
let ablyRest: Rest | null = null;

function getDb() {
  if (db) return db;
  var env = loadWorkerEnv();
  db = createDb(env.DATABASE_URL);
  return db;
}

function getAblyChannel(recipientId: string, apiKey: string) {
  if (!ablyRest) {
    ablyRest = new Rest({ key: apiKey });
  }

  return ablyRest.channels.get(`user:${recipientId}:notifications`);
}

export async function runNotificationPublishJob(payload: NotificationPublishJobPayload): Promise<boolean> {
  var env = loadWorkerEnv();
  var apiKey = env.ABLY_API_KEY.trim();

  var notificationId = payload.notificationId?.trim();
  if (!notificationId) {
    return false;
  }

  var dbClient = getDb();
  var rows: Array<{
    recipientId: string;
    bundleCount: number;
    actorIds?: unknown;
    entityId: string | null;
    entityType: string | null;
    type: string;
  }> = [];

  try {
    rows = await dbClient
      .select({
        recipientId: notifications.recipientId,
        bundleCount: notifications.bundleCount,
        actorIds: notifications.actorIds,
        entityId: notifications.entityId,
        entityType: notifications.entityType,
        type: notifications.type,
      })
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);
  } catch (error) {
    if (!isMissingActorIdsColumnError(error)) {
      throw error;
    }

    rows = await dbClient
      .select({
        recipientId: notifications.recipientId,
        bundleCount: notifications.bundleCount,
        actorIds: sql`'{}'::text[]`,
        entityId: notifications.entityId,
        entityType: notifications.entityType,
        type: notifications.type,
      })
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);
  }

  if (rows.length === 0) {
    return false;
  }

  var row = rows[0];
  if (!row.bundleCount || row.bundleCount < 1) {
    return false;
  }

  var actorIds = normalizeActorIds(row.actorIds);
  var actorIdSet = new Set<string>();
  for (var i = 0; i < actorIds.length; i += 1) {
    var actorId = actorIds[i];
    if (actorId) {
      actorIdSet.add(actorId);
    }
  }

  var actorProfileRows = actorIdSet.size > 0
    ? await dbClient
        .select({
          userId: profiles.userId,
          username: profiles.username,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        })
        .from(profiles)
        .where(inArray(profiles.userId, Array.from(actorIdSet)))
    : [];

  var actorProfileMap = new Map<string, ActorProfile>();
  for (var j = 0; j < actorProfileRows.length; j += 1) {
    var actorProfile = actorProfileRows[j];
    actorProfileMap.set(actorProfile.userId, actorProfile);
  }

  var actorProfiles = actorIds
    .map(function (actorId) {
      return actorProfileMap.get(actorId);
    })
    .filter(function (profile): profile is ActorProfile {
      return Boolean(profile);
    });

  void sendNotificationEmail({
    notificationId,
    recipientId: row.recipientId,
    type: row.type,
    entityId: row.entityId,
    entityType: row.entityType,
    bundleCount: row.bundleCount,
    actorProfiles,
    db: dbClient,
  }).catch(function (error) {
    console.error("[notification-email] side effect failed", {
      notificationId,
      recipientId: row.recipientId,
      type: row.type,
      error,
    });
  });

  var published = false;
  if (apiKey) {
    var channel = getAblyChannel(rows[0].recipientId, apiKey);
    try {
      await channel.publish("notification.new", {
        notificationId,
        actorIds,
        actorProfiles,
        bundleCount: row.bundleCount,
        type: row.type,
        entityId: row.entityId,
        entityType: row.entityType,
      });
      published = true;
    } catch (error) {
      console.error("[notification-publish] realtime publish failed", {
        notificationId,
        recipientId: row.recipientId,
        type: row.type,
        error,
      });
    }
  }

  return published;
}
