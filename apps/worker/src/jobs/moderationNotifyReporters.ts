import { createPooledDb } from "@35mm/db";
import {
  moderationActions,
  moderationNotificationOutbox,
} from "@35mm/db/schema";
import { eq, sql } from "drizzle-orm";
import type { Queue } from "bullmq";
import { loadWorkerEnv } from "../lib/env.js";
import { workerNotificationService } from "../lib/notificationService.js";

type ClaimedOutboxRow = {
  id: string;
  action_id: string;
  resolution: "actioned" | "dismissed";
  attempt_count: number;
  report_cursor: string | null;
};

var db: ReturnType<typeof createPooledDb> | null = null;

function getWriteDb() {
  if (!db) db = createPooledDb(loadWorkerEnv().DATABASE_URL);
  return db;
}

function batchSize(): number {
  var configured = loadWorkerEnv().MODERATION_NOTIFICATION_BATCH_SIZE;
  if (!Number.isFinite(configured)) return 500;
  return Math.max(1, Math.min(Math.floor(configured), 2000));
}

async function claimOutboxRows(): Promise<ClaimedOutboxRow[]> {
  var result = await getWriteDb().execute(sql`
    with candidates as (
      select id
      from moderation_notification_outbox
      where processed_at is null
        and (
          (status = 'pending' and available_at <= now())
          or (status = 'processing' and locked_at < now() - interval '5 minutes')
        )
      order by available_at, id
      limit 10
      for update skip locked
    )
    update moderation_notification_outbox outbox
    set status = 'processing',
        attempt_count = outbox.attempt_count + 1,
        locked_at = now(),
        updated_at = now()
    from candidates
    where outbox.id = candidates.id
    returning outbox.id, outbox.action_id, outbox.resolution, outbox.attempt_count, outbox.report_cursor
  `);
  return result.rows as ClaimedOutboxRow[];
}

async function processOutboxRow(row: ClaimedOutboxRow, queue: Queue): Promise<boolean> {
  var database = getWriteDb();
  var actionRows = await database.select({
    id: moderationActions.id,
    contentType: moderationActions.contentType,
    contentId: moderationActions.contentId,
    subjectUserId: moderationActions.subjectUserId,
    action: moderationActions.action,
    reason: moderationActions.reason,
  }).from(moderationActions).where(eq(moderationActions.id, row.action_id)).limit(1);
  var action = actionRows[0];
  if (!action) throw new Error("Moderation notification action not found: " + row.action_id);

  var service = workerNotificationService(queue);
  if (row.resolution === "actioned" && action.subjectUserId && action.action !== "no_action") {
    var authorResult = await service.createNotification({
      recipientId: action.subjectUserId,
      actorId: null,
      type: "content_moderated",
      entityType: action.contentType === "profile" ? "user" : action.contentType,
      entityId: action.contentId,
      metadata: {
        contentType: action.contentType,
        action: action.action,
        reason: action.reason,
        message: "Your content was moderated.",
      },
      sourceKey: "moderation:author:" + action.id,
    });
    if (!authorResult.ok || !authorResult.shouldPublish) {
      throw new Error("Moderation author notification publish enqueue failed");
    }
  }

  var limit = batchSize();
  var reporterResult = await database.execute(sql`
    select r.id, r.reporter_user_id
    from reports r
    where r.resolved_action_id = ${action.id}
      and (${row.report_cursor}::text is null or r.id > ${row.report_cursor})
    order by r.id
    limit ${limit}
  `);
  var reporterRows = reporterResult.rows as Array<{ id: string; reporter_user_id: string }>;
  if (reporterRows.length > 0) {
    var batch = await service.createNotifications(reporterRows.map(function (report) {
      return {
        recipientId: report.reporter_user_id,
        actorId: null,
        type: "report_status_update" as const,
        entityType: action.contentType === "profile" ? "user" as const : action.contentType,
        entityId: action.contentId,
        metadata: {
          outcome: row.resolution,
          message: row.resolution === "actioned"
            ? "We reviewed your report and took action."
            : "We reviewed your report and did not find a violation.",
        },
        sourceKey: "moderation:reporter:" + report.id,
      };
    }));
    if (!batch.shouldPublish) throw new Error("Moderation reporter notification publish enqueue failed");
  }

  var followUp = reporterRows.length >= limit;
  var nextReportCursor = reporterRows[reporterRows.length - 1]?.id ?? row.report_cursor;
  await database.update(moderationNotificationOutbox).set(followUp ? {
    status: "pending",
    availableAt: new Date(),
    lockedAt: null,
    lastError: null,
    reportCursor: nextReportCursor,
    updatedAt: new Date(),
  } : {
    status: "processed",
    processedAt: new Date(),
    lockedAt: null,
    lastError: null,
    reportCursor: nextReportCursor,
    updatedAt: new Date(),
  }).where(eq(moderationNotificationOutbox.id, row.id));
  return followUp;
}

async function releaseFailed(row: ClaimedOutboxRow, error: unknown): Promise<void> {
  var maxAttempts = 12;
  var failed = row.attempt_count >= maxAttempts;
  var delayMs = Math.min(60_000, 1000 * Math.pow(2, Math.max(0, row.attempt_count - 1)));
  await getWriteDb().update(moderationNotificationOutbox).set({
    status: failed ? "failed" : "pending",
    availableAt: new Date(Date.now() + delayMs),
    lockedAt: null,
    lastError: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000),
    updatedAt: new Date(),
  }).where(eq(moderationNotificationOutbox.id, row.id));
}

export async function runModerationNotifyReporters(
  _payload: unknown,
  queue: Queue
): Promise<{ claimed: number; processed: number; followUp: boolean }> {
  var rows = await claimOutboxRows();
  var processed = 0;
  var followUp = false;
  for (var row of rows) {
    try {
      followUp = (await processOutboxRow(row, queue)) || followUp;
      processed += 1;
    } catch (error) {
      await releaseFailed(row, error);
      console.error("[moderation.notifyReporters] outbox row failed", {
        outboxId: row.id,
        actionId: row.action_id,
        error,
      });
    }
  }
  return { claimed: rows.length, processed, followUp };
}
