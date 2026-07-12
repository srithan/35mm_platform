import { and, count, eq, sql } from "drizzle-orm";
import { notifications } from "@35mm/db/schema";
import { createNotificationService } from "@35mm/db/notification-service";
import { getDb } from "./db.js";
import { enqueueNotificationPublishJob } from "./jobs.js";

const MARK_ALL_NOTIFICATIONS_READ_BATCH_SIZE = 5000;

var notificationService = createNotificationService({
  getDb,
  enqueuePublish: async function (notificationIds, delayMs) {
    var results = await Promise.all(notificationIds.map(function (notificationId) {
      return enqueueNotificationPublishJob({ notificationId, delayMs });
    }));
    return results.every(Boolean);
  },
});

export var createNotification = notificationService.createNotification;
export var createNotifications = notificationService.createNotifications;

function numericCount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function getUnreadNotificationCount(recipientId: string): Promise<number> {
  var rows = await getDb()
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientId, recipientId), eq(notifications.isRead, false)));
  return numericCount(rows[0]?.count);
}

export async function markNotificationRead(recipientId: string, notificationId: string): Promise<boolean> {
  var updated = await getDb().update(notifications).set({ isRead: true }).where(and(
    eq(notifications.recipientId, recipientId),
    eq(notifications.id, notificationId)
  )).returning({ id: notifications.id });
  return updated.length > 0;
}

export async function markNotificationUnread(recipientId: string, notificationId: string): Promise<boolean> {
  var updated = await getDb().update(notifications).set({ isRead: false }).where(and(
    eq(notifications.recipientId, recipientId),
    eq(notifications.id, notificationId)
  )).returning({ id: notifications.id });
  return updated.length > 0;
}

export async function markAllNotificationsRead(recipientId: string): Promise<number> {
  var db = getDb();
  var cutoffResult = await db.execute<{ cutoff: Date | string }>(sql`select now() as cutoff`);
  var readCutoff = cutoffResult.rows[0]?.cutoff ?? new Date();
  var updatedTotal = 0;

  while (true) {
    var result = await db.execute<{ updated_count: number | string | bigint | null }>(sql`
      with unread as (
        select ${notifications.id} as id
        from ${notifications}
        where ${notifications.recipientId} = ${recipientId}
          and ${notifications.isRead} = false
          and ${notifications.createdAt} <= ${readCutoff}
        limit ${MARK_ALL_NOTIFICATIONS_READ_BATCH_SIZE}
      ),
      updated as (
        update ${notifications}
        set "is_read" = true
        from unread
        where ${notifications.id} = unread.id
          and ${notifications.recipientId} = ${recipientId}
          and ${notifications.isRead} = false
          and ${notifications.createdAt} <= ${readCutoff}
        returning 1
      )
      select count(*)::integer as updated_count from updated
    `);
    var updatedCount = numericCount(result.rows[0]?.updated_count);
    if (updatedCount === 0) break;
    updatedTotal += updatedCount;
  }

  return updatedTotal;
}
