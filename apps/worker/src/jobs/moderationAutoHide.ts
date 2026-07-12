import { createPooledDb } from "@35mm/db";
import {
  comments,
  moderationActions,
  moderationContentState,
  posts,
  profiles,
  reports,
} from "@35mm/db/schema";
import type { ModerationContentType } from "@35mm/types";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { Queue } from "bullmq";
import { ulid } from "ulid";
import { loadWorkerEnv } from "../lib/env.js";
import { syncModerationEnforcementCaches } from "../lib/feedCache.js";
import { workerNotificationService } from "../lib/notificationService.js";

export type ModerationAutoHideCheckPayload = {
  reportId: string;
  contentType: ModerationContentType;
  contentId: string;
};

type AutoHideResult = {
  actionId: string;
  authorUserId: string;
  changed: boolean;
};

var db: ReturnType<typeof createPooledDb> | null = null;

function getWriteDb() {
  if (!db) db = createPooledDb(loadWorkerEnv().DATABASE_URL);
  return db;
}

function boundedInteger(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(Math.floor(value), max));
}

export function moderationAutoHideConfig() {
  var env = loadWorkerEnv();
  return {
    threshold: boundedInteger(env.MODERATION_AUTO_HIDE_THRESHOLD, 5, 1, 1000),
    windowMinutes: boundedInteger(env.MODERATION_AUTO_HIDE_WINDOW_MINUTES, 60, 1, 24 * 60),
    trustedFollowerThreshold: boundedInteger(
      env.MODERATION_AUTO_HIDE_TRUSTED_FOLLOWER_THRESHOLD,
      50_000,
      0,
      1_000_000_000
    ),
  };
}

export function shouldAutoHideCandidate(input: {
  stateStatus: string;
  reportCount: number;
  recentReportCount: number;
  followerCount: number;
  threshold: number;
  trustedFollowerThreshold: number;
}): boolean {
  return input.stateStatus === "visible" &&
    input.reportCount >= input.threshold &&
    input.recentReportCount >= input.threshold &&
    input.followerCount < input.trustedFollowerThreshold;
}

function assertPayload(value: unknown): ModerationAutoHideCheckPayload {
  if (!value || typeof value !== "object") throw new Error("Invalid moderation.autoHideCheck payload");
  var payload = value as Partial<ModerationAutoHideCheckPayload>;
  if (!payload.reportId?.trim() || !payload.contentId?.trim()) {
    throw new Error("Invalid moderation.autoHideCheck payload identifiers");
  }
  if (payload.contentType !== "post" && payload.contentType !== "comment" && payload.contentType !== "profile") {
    throw new Error("Invalid moderation.autoHideCheck contentType");
  }
  return payload as ModerationAutoHideCheckPayload;
}

async function resolveTarget(tx: any, contentType: ModerationContentType, contentId: string) {
  if (contentType === "post") {
    return (await tx.select({ authorUserId: posts.userId }).from(posts).where(eq(posts.id, contentId)).limit(1))[0] ?? null;
  }
  if (contentType === "comment") {
    return (await tx.select({ authorUserId: comments.userId }).from(comments).where(eq(comments.id, contentId)).limit(1))[0] ?? null;
  }
  return (await tx.select({ authorUserId: profiles.userId }).from(profiles).where(eq(profiles.userId, contentId)).limit(1))[0] ?? null;
}

async function applyTargetStatus(tx: any, contentType: ModerationContentType, contentId: string, now: Date) {
  if (contentType === "post") {
    await tx.update(posts).set({ moderationStatus: "hidden", updatedAt: now }).where(eq(posts.id, contentId));
  } else if (contentType === "comment") {
    await tx.update(comments).set({ moderationStatus: "hidden", updatedAt: now }).where(eq(comments.id, contentId));
  } else {
    await tx.update(profiles).set({ moderationStatus: "hidden", updatedAt: now }).where(eq(profiles.userId, contentId));
  }
}

export async function runModerationAutoHideCheck(
  payloadValue: unknown,
  queue: Queue
): Promise<{ hidden: boolean; actionId: string | null }> {
  var payload = assertPayload(payloadValue);
  var config = moderationAutoHideConfig();
  var result = await getWriteDb().transaction(async function (tx): Promise<AutoHideResult | null> {
    await tx.execute(sql`set local lock_timeout = '2s'`);
    var stateResult = await tx.execute(sql`
      select status, report_count
      from moderation_content_state
      where content_type = ${payload.contentType}::moderation_content_type
        and content_id = ${payload.contentId}
      for update
    `);
    var state = stateResult.rows[0] as { status?: string; report_count?: number } | undefined;
    if (!state) return null;

    if (state.status !== "visible") {
      var existing = await tx.select({
        id: moderationActions.id,
        authorUserId: moderationActions.subjectUserId,
        metadata: moderationActions.metadata,
      }).from(moderationActions).where(and(
        eq(moderationActions.contentType, payload.contentType),
        eq(moderationActions.contentId, payload.contentId),
        eq(moderationActions.actorType, "system"),
        eq(moderationActions.action, "content_hidden")
      )).orderBy(desc(moderationActions.createdAt), desc(moderationActions.id)).limit(1);
      var prior = existing[0];
      if (prior?.authorUserId && prior.metadata?.autoHide === true) {
        return { actionId: prior.id, authorUserId: prior.authorUserId, changed: false };
      }
      return null;
    }

    if (Number(state.report_count ?? 0) < config.threshold) return null;
    var cutoff = new Date(Date.now() - config.windowMinutes * 60 * 1000);
    var recentReports = await tx.select({ id: reports.id }).from(reports).where(and(
      eq(reports.contentType, payload.contentType),
      eq(reports.contentId, payload.contentId),
      inArray(reports.status, ["open", "reviewing"]),
      gte(reports.createdAt, cutoff)
    )).limit(config.threshold);
    var target = await resolveTarget(tx, payload.contentType, payload.contentId);
    if (!target) return null;
    var authorRows = await tx.select({ followerCount: profiles.followerCount })
      .from(profiles).where(eq(profiles.userId, target.authorUserId)).limit(1);
    if (!shouldAutoHideCandidate({
      stateStatus: state.status ?? "visible",
      reportCount: Number(state.report_count ?? 0),
      recentReportCount: recentReports.length,
      followerCount: Number(authorRows[0]?.followerCount ?? 0),
      threshold: config.threshold,
      trustedFollowerThreshold: config.trustedFollowerThreshold,
    })) return null;

    var now = new Date();
    var actionId = ulid();
    var reportId = recentReports.some(function (row: { id: string }) { return row.id === payload.reportId; })
      ? payload.reportId
      : recentReports[0]?.id ?? null;
    await tx.insert(moderationActions).values({
      id: actionId,
      reportId,
      contentType: payload.contentType,
      contentId: payload.contentId,
      actorType: "system",
      actorUserId: null,
      subjectUserId: target.authorUserId,
      action: "content_hidden",
      reason: "Automated review threshold reached",
      notes: null,
      metadata: {
        autoHide: true,
        threshold: config.threshold,
        windowMinutes: config.windowMinutes,
        trustedFollowerThreshold: config.trustedFollowerThreshold,
      },
      createdAt: now,
    });
    await tx.update(moderationContentState).set({
      status: "hidden",
      hiddenAt: now,
      removedAt: null,
      updatedAt: now,
    }).where(and(
      eq(moderationContentState.contentType, payload.contentType),
      eq(moderationContentState.contentId, payload.contentId)
    ));
    await applyTargetStatus(tx, payload.contentType, payload.contentId, now);
    return { actionId, authorUserId: target.authorUserId, changed: true };
  });

  if (!result) return { hidden: false, actionId: null };
  var cacheSynced = await syncModerationEnforcementCaches({
    contentType: payload.contentType,
    contentId: payload.contentId,
    authorUserId: result.authorUserId,
    status: "hidden",
  });
  if (!cacheSynced) throw new Error("Auto-hide committed but moderation cache synchronization failed");

  var notification = await workerNotificationService(queue).createNotification({
    recipientId: result.authorUserId,
    actorId: null,
    type: "content_under_review",
    entityType: payload.contentType === "profile" ? "user" : payload.contentType,
    entityId: payload.contentId,
    metadata: {
      contentType: payload.contentType,
      status: "hidden",
      message: "Your content is under review.",
    },
    sourceKey: "moderation:auto-hide:author:" + result.actionId,
  });
  if (!notification.ok || !notification.shouldPublish) {
    throw new Error("Auto-hide notification publish enqueue failed");
  }
  return { hidden: result.changed, actionId: result.actionId };
}
