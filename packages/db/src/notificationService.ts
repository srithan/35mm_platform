import { and, eq, inArray, sql } from "drizzle-orm";
import { notifications, userBlocks, userMutes, userSettings } from "./schema/index.js";

export type NotificationType =
  | "like"
  | "comment"
  | "reply"
  | "follow"
  | "follow_request"
  | "follow_request_approved"
  | "mention"
  | "repost"
  | "film_logged"
  | "chat_reaction"
  | "report_status_update"
  | "content_moderated"
  | "content_under_review";

export type NotificationEntityKind =
  | "post"
  | "comment"
  | "user"
  | "film"
  | "chat_thread"
  | null;

export type NotificationInput = {
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  entityType: NotificationEntityKind;
  entityId: string | null;
  metadata?: Record<string, unknown>;
  sourceKey?: string;
};

export type NotificationCreateOptions = {
  delayMs?: number;
};

export type NotificationResult =
  | { ok: true; notificationId: string; shouldPublish: boolean }
  | { ok: false; reason: "disabled" | "skipped" };

type NotificationServiceDependencies = {
  getDb: () => any;
  enqueuePublish: (notificationIds: string[], delayMs: number) => Promise<boolean>;
};

type NotificationSettings = {
  notifyLikesOnPosts: boolean;
  notifyCommentsAndReplies: boolean;
  notifyNewFollowers: boolean;
  notifyMentions: boolean;
};

function isMandatoryModerationType(type: NotificationType): boolean {
  return type === "report_status_update" || type === "content_moderated" || type === "content_under_review";
}

function canPreferenceNotify(type: NotificationType, settings: NotificationSettings): boolean {
  if (isMandatoryModerationType(type)) return true;
  if (type === "follow" || type === "follow_request" || type === "follow_request_approved") return settings.notifyNewFollowers;
  if (type === "like" || type === "repost") return settings.notifyLikesOnPosts;
  if (type === "comment" || type === "reply") return settings.notifyCommentsAndReplies;
  if (type === "mention") return settings.notifyMentions;
  if (type === "chat_reaction") return true;
  return false;
}

function shouldBundle(type: NotificationType): boolean {
  return type === "like" || type === "comment" || type === "reply" || type === "repost" ||
    type === "follow" || type === "follow_request" || type === "follow_request_approved";
}

function mergeActorIds(current: string[] | null, nextActorId: string | null): string[] {
  if (!nextActorId) return current ?? [];
  var values = [nextActorId];
  for (var actorId of current ?? []) {
    if (actorId && actorId !== nextActorId) values.push(actorId);
  }
  return values.slice(0, 3);
}

export function createNotificationService(dependencies: NotificationServiceDependencies) {
  async function shouldEmit(input: NotificationInput): Promise<boolean> {
    if (isMandatoryModerationType(input.type)) return true;
    if (input.actorId && input.actorId === input.recipientId) return false;
    var db = dependencies.getDb();
    var settingRows = await db
      .select({
        likesOnPosts: userSettings.notifyLikesOnPosts,
        commentsAndReplies: userSettings.notifyCommentsAndReplies,
        newFollowers: userSettings.notifyNewFollowers,
        mentions: userSettings.notifyMentions,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, input.recipientId))
      .limit(1);
    var setting = settingRows[0];
    if (!canPreferenceNotify(input.type, {
      notifyLikesOnPosts: setting?.likesOnPosts ?? true,
      notifyCommentsAndReplies: setting?.commentsAndReplies ?? true,
      notifyNewFollowers: setting?.newFollowers ?? true,
      notifyMentions: setting?.mentions ?? true,
    })) return false;
    if (!input.actorId) return true;

    var relationshipRows = await db
      .select({
        blocked: sql<boolean>`exists(
          select 1 from ${userBlocks}
          where (${userBlocks.blockerId} = ${input.actorId} and ${userBlocks.blockedId} = ${input.recipientId})
             or (${userBlocks.blockerId} = ${input.recipientId} and ${userBlocks.blockedId} = ${input.actorId})
        )`,
        muted: sql<boolean>`exists(
          select 1 from ${userMutes}
          where ${userMutes.muterId} = ${input.recipientId}
            and ${userMutes.mutedId} = ${input.actorId}
        )`,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, input.recipientId))
      .limit(1);
    return !relationshipRows[0]?.blocked && !relationshipRows[0]?.muted;
  }

  async function createNotifications(
    inputs: NotificationInput[],
    options: NotificationCreateOptions = {}
  ): Promise<{ notificationIds: string[]; shouldPublish: boolean }> {
    if (inputs.length === 0) return { notificationIds: [], shouldPublish: true };
    var uniqueBySource = new Map<string, NotificationInput>();
    for (var input of inputs) {
      if (!isMandatoryModerationType(input.type)) {
        throw new Error("Batch notification creation is restricted to moderation notifications");
      }
      if (!input.sourceKey?.trim()) {
        throw new Error("Batch notification sourceKey is required");
      }
      uniqueBySource.set(input.sourceKey.trim(), { ...input, sourceKey: input.sourceKey.trim() });
    }
    var values = Array.from(uniqueBySource.values());
    var db = dependencies.getDb();
    await db
      .insert(notifications)
      .values(values.map(function (input) {
        return {
          recipientId: input.recipientId,
          actorId: input.actorId,
          actorIds: input.actorId ? [input.actorId] : [],
          type: input.type,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: input.metadata ?? {},
          sourceKey: input.sourceKey,
          bundleCount: 1,
        };
      }))
      .onConflictDoNothing({ target: notifications.sourceKey });
    var rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(inArray(notifications.sourceKey, Array.from(uniqueBySource.keys())));
    var notificationIds = rows.map(function (row: { id: string }) { return row.id; });
    var shouldPublish = await dependencies.enqueuePublish(notificationIds, options.delayMs ?? 0);
    return { notificationIds, shouldPublish };
  }

  async function createNotification(
    input: NotificationInput,
    options: NotificationCreateOptions = {}
  ): Promise<NotificationResult> {
    if (!(await shouldEmit(input))) return { ok: false, reason: "skipped" };
    if (input.sourceKey) {
      var batch = await createNotifications([input], options);
      var existingId = batch.notificationIds[0];
      return existingId
        ? { ok: true, notificationId: existingId, shouldPublish: batch.shouldPublish }
        : { ok: false, reason: "skipped" };
    }

    var db = dependencies.getDb();
    if (shouldBundle(input.type) && input.entityId !== null && input.entityType !== null) {
      var existing = await db
        .select({
          id: notifications.id,
          bundleCount: notifications.bundleCount,
          actorId: notifications.actorId,
          actorIds: notifications.actorIds,
        })
        .from(notifications)
        .where(and(
          eq(notifications.recipientId, input.recipientId),
          eq(notifications.type, input.type),
          eq(notifications.isRead, false),
          eq(notifications.entityId, input.entityId),
          eq(notifications.entityType, input.entityType)
        ))
        .orderBy(notifications.createdAt)
        .limit(1);
      if (existing[0]) {
        await db.update(notifications).set({
          bundleCount: existing[0].bundleCount + 1,
          actorId: input.actorId ?? existing[0].actorId,
          actorIds: mergeActorIds(existing[0].actorIds, input.actorId),
          createdAt: new Date(),
        }).where(eq(notifications.id, existing[0].id));
        var bundledPublished = await dependencies.enqueuePublish([existing[0].id], options.delayMs ?? 0);
        return { ok: true, notificationId: existing[0].id, shouldPublish: bundledPublished };
      }
    }

    var inserted = await db.insert(notifications).values({
      recipientId: input.recipientId,
      actorId: input.actorId,
      actorIds: input.actorId ? [input.actorId] : [],
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
      bundleCount: 1,
    }).returning({ id: notifications.id });
    var notificationId = inserted[0]?.id;
    if (!notificationId) return { ok: false, reason: "skipped" };
    var published = await dependencies.enqueuePublish([notificationId], options.delayMs ?? 0);
    return { ok: true, notificationId, shouldPublish: published };
  }

  return { createNotification, createNotifications };
}
