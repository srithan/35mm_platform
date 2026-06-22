import { and, count, eq, isNull, sql } from "drizzle-orm";
import { notifications, userMutes, userSettings, type notifications as NotificationsTable } from "@35mm/db/schema";
import { getDb } from "./db.js";
import { enqueueNotificationPublishJob } from "./jobs.js";
import { getModerationStatus } from "./moderation.js";

type NotificationSettings = {
  notifyLikesOnPosts: boolean;
  notifyCommentsAndReplies: boolean;
  notifyNewFollowers: boolean;
  notifyMentions: boolean;
};

type NotificationEntityKind = "post" | "comment" | "user" | null;

type NotificationInput = {
  recipientId: string;
  actorId: string | null;
  type: "like" | "comment" | "reply" | "follow" | "follow_request" | "follow_request_approved" | "mention" | "repost";
  entityType: NotificationEntityKind;
  entityId: string | null;
};

type NotificationCreateOptions = {
  delayMs?: number;
};

type NotificationResult =
  | {
      ok: true;
      notificationId: string;
      shouldPublish: boolean;
    }
  | {
      ok: false;
      reason: "disabled" | "skipped";
    };

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
    message.includes("column") && message.includes("does not exist")
  );
}

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
          var cleaned = part.trim().replace(/^"(.*)"$/s, "$1");
          return cleaned;
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

function canPreferenceNotify(type: NotificationInput["type"], settings: NotificationSettings): boolean {
  if (type === "follow" || type === "follow_request" || type === "follow_request_approved") return settings.notifyNewFollowers;
  if (type === "like" || type === "repost") return settings.notifyLikesOnPosts;
  if (type === "comment" || type === "reply") return settings.notifyCommentsAndReplies;
  if (type === "mention") return settings.notifyMentions;
  return false;
}

async function isMutedByRecipient(recipientId: string, actorId: string): Promise<boolean> {
  var db = getDb();
  var rows = await db
    .select({
      isMuted: sql<boolean>`exists(
        select 1
        from ${userMutes}
        where ${userMutes.muterId} = ${recipientId}
          and ${userMutes.mutedId} = ${actorId}
      )`,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, recipientId))
    .limit(1);

  return rows[0]?.isMuted ?? false;
}

async function hasNotificationSettingsEnabled(recipientId: string, type: NotificationInput["type"]): Promise<boolean> {
  var db = getDb();
  var rows = await db
    .select({
      likesOnPosts: userSettings.notifyLikesOnPosts,
      commentsAndReplies: userSettings.notifyCommentsAndReplies,
      newFollowers: userSettings.notifyNewFollowers,
      mentions: userSettings.notifyMentions,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, recipientId))
    .limit(1);

  if (rows.length === 0) {
    return canPreferenceNotify(type, {
      notifyLikesOnPosts: true,
      notifyCommentsAndReplies: true,
      notifyNewFollowers: true,
      notifyMentions: true,
    });
  }

  var settings: NotificationSettings = {
    notifyLikesOnPosts: rows[0]?.likesOnPosts ?? true,
    notifyCommentsAndReplies: rows[0]?.commentsAndReplies ?? true,
    notifyNewFollowers: rows[0]?.newFollowers ?? true,
    notifyMentions: rows[0]?.mentions ?? true,
  };

  return canPreferenceNotify(type, settings);
}

async function shouldEmitNotification(input: NotificationInput): Promise<boolean> {
  if (input.actorId && input.actorId === input.recipientId) return false;

  var settingsEnabled = await hasNotificationSettingsEnabled(input.recipientId, input.type);
  if (!settingsEnabled) return false;

  if (!input.actorId) return true;

  var moderation = await getModerationStatus(input.actorId, input.recipientId);
  if (moderation.blockedByViewer || moderation.blockedByTarget || moderation.isMutedByViewer) {
    return false;
  }

  return !(await isMutedByRecipient(input.recipientId, input.actorId));
}

function shouldBundle(type: NotificationInput["type"]): boolean {
  return (
    type === "like" ||
    type === "comment" ||
    type === "reply" ||
    type === "repost" ||
    type === "follow" ||
    type === "follow_request" ||
    type === "follow_request_approved"
  );
}

function entityFilterClauses(input: NotificationInput) {
  return [
    eq(notifications.recipientId, input.recipientId),
    eq(notifications.type, input.type),
    eq(notifications.isRead, false),
    input.entityId === null
      ? isNull(notifications.entityId)
      : eq(notifications.entityId, input.entityId),
    input.entityType === null
      ? isNull(notifications.entityType)
      : eq(notifications.entityType, input.entityType),
  ];
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export async function createNotification(
  input: NotificationInput,
  options: NotificationCreateOptions = {}
): Promise<NotificationResult> {
  var allowed = await shouldEmitNotification(input);
  if (!allowed) return { ok: false, reason: "skipped" };

  var delayMs = options.delayMs ?? 0;

  var db = getDb();

  function mergeActorIds(
    currentActorIds: string[] | null,
    nextActorId: string | null
  ): string[] {
    if (!nextActorId) return currentActorIds ?? [];

    var deduped = [nextActorId];
    for (var i = 0; i < (currentActorIds?.length ?? 0); i += 1) {
      var actorId = currentActorIds?.[i];
      if (!actorId || actorId === nextActorId) continue;
      deduped.push(actorId);
    }

    return deduped.slice(0, 3);
  }

  if (shouldBundle(input.type) && input.entityId !== null && input.entityType !== null) {
    var includeActorIds = true;
    var existingRows: Array<{
      id: string;
      bundleCount: number;
      actorId: string | null;
      actorIds?: string[] | null;
    }> = [];

    try {
      existingRows = await db
        .select({
          id: notifications.id,
          bundleCount: notifications.bundleCount,
          actorId: notifications.actorId,
          actorIds: notifications.actorIds,
        })
        .from(notifications)
        .where(and(...entityFilterClauses(input)))
        .orderBy(notifications.createdAt)
        .limit(1);
    } catch (error) {
      if (!isMissingActorIdsColumnError(error)) {
        throw error;
      }

      includeActorIds = false;
      existingRows = await db
        .select({
          id: notifications.id,
          bundleCount: notifications.bundleCount,
          actorId: notifications.actorId,
        })
        .from(notifications)
        .where(and(...entityFilterClauses(input)))
        .orderBy(notifications.createdAt)
        .limit(1);
    }

    if (existingRows.length > 0) {
      var currentActorIds = normalizeActorIds(existingRows[0].actorIds);
      await db
        .update(notifications)
        .set({
          bundleCount: existingRows[0].bundleCount + 1,
          actorId: input.actorId ?? existingRows[0].actorId,
          ...(includeActorIds ? { actorIds: mergeActorIds(currentActorIds, input.actorId) } : {}),
          createdAt: new Date(),
        })
        .where(eq(notifications.id, existingRows[0].id));

      var published = await enqueueNotificationPublishJob({
        notificationId: existingRows[0].id,
        delayMs,
      });
      return {
        ok: true,
        notificationId: existingRows[0].id,
        shouldPublish: published,
      };
    }
  }

  var inserted: Array<{ id: string }> = [];
  try {
    inserted = await db
      .insert(notifications)
      .values({
        recipientId: input.recipientId,
        actorId: input.actorId,
        actorIds: input.actorId ? normalizeActorIds([input.actorId]) : [],
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        bundleCount: 1,
      })
      .returning({ id: notifications.id });
  } catch (error) {
    if (!isMissingActorIdsColumnError(error)) {
      throw error;
    }

    inserted = await db
      .insert(notifications)
      .values({
        recipientId: input.recipientId,
        actorId: input.actorId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        bundleCount: 1,
      })
      .returning({ id: notifications.id });
  }

  var notificationId = inserted[0]?.id;
  if (!notificationId) {
    return { ok: false, reason: "skipped" };
  }

  var published = await enqueueNotificationPublishJob({ notificationId, delayMs });
  return {
    ok: true,
    notificationId,
    shouldPublish: published,
  };
}

export async function getUnreadNotificationCount(recipientId: string): Promise<number> {
  var db = getDb();
  var rows = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientId, recipientId), eq(notifications.isRead, false)));
  var rowCount = rows[0]?.count;
  return typeof rowCount === "number" ? rowCount : Number(rowCount ?? 0);
}

export async function markNotificationRead(
  recipientId: string,
  notificationId: string
): Promise<boolean> {
  var db = getDb();
  var updated = await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.recipientId, recipientId), eq(notifications.id, notificationId))
    )
    .returning({ id: notifications.id });

  return updated.length > 0;
}

export async function markNotificationUnread(
  recipientId: string,
  notificationId: string
): Promise<boolean> {
  var db = getDb();
  var updated = await db
    .update(notifications)
    .set({ isRead: false })
    .where(
      and(eq(notifications.recipientId, recipientId), eq(notifications.id, notificationId))
    )
    .returning({ id: notifications.id });

  return updated.length > 0;
}

export async function markAllNotificationsRead(recipientId: string): Promise<number> {
  var db = getDb();
  var updated = await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.recipientId, recipientId), eq(notifications.isRead, false))
    )
    .returning({ id: notifications.id });

  return updated.length;
}
