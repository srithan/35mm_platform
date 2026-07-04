import { Queue } from "bullmq";
import {
  and,
  desc,
  eq,
  inArray,
  lt,
  or,
  sql,
} from "drizzle-orm";
import {
  createDb,
  createPooledDb,
  type Db,
  type PooledDb,
  counterJobs,
  counterJobDeltas,
  follows,
  notifications,
  userBlocks,
  userMutes,
  userSettings,
} from "@35mm/db";
import { loadWorkerEnv } from "../lib/env.js";

type FollowApprovalPayload = {
  targetUserId: string;
  cursor: string | null;
};

type PendingFollowRow = {
  followerId: string;
  createdAt: Date;
};

type FollowApprovalCursor = {
  createdAt: string;
  followerId: string;
};

type CursorQuery = {
  createdAt: Date;
  followerId: string;
};

type NotificationActorRow = {
  id: string;
  actorId: string | null;
  actorIds: string[] | null;
};

type CounterBatch = {
  targetTable: string;
  targetId: string;
  counterName: string;
  delta: number;
};

type ProfileFollowApprovalDb = Db | PooledDb;

type PooledProfileFollowApprovalDb = PooledDb & {
  transaction: PooledDb["transaction"];
};

function getProfileFollowApprovalBatchSize(): number {
  var configured = Number(process.env.PROFILE_FOLLOW_APPROVAL_BATCH_SIZE ?? "250");
  if (!Number.isFinite(configured)) return 250;
  return Math.max(1, Math.min(Math.floor(configured), 5000));
}

var db: ProfileFollowApprovalDb | null = null;

function getDb(): ProfileFollowApprovalDb {
  if (db) return db;

  var env = loadWorkerEnv();
  try {
    db = createPooledDb(env.DATABASE_URL);
    return db;
  } catch (_error) {
    db = createDb(env.DATABASE_URL);
    return db;
  }
}

function isPooledDb(database: ProfileFollowApprovalDb): database is PooledProfileFollowApprovalDb {
  return typeof (database as { transaction?: unknown }).transaction === "function";
}

function parsePayload(value: unknown): FollowApprovalPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid profile.followApproval payload");
  }

  var payload = value as Partial<FollowApprovalPayload>;
  if (typeof payload.targetUserId !== "string" || payload.targetUserId.trim().length === 0) {
    throw new Error("Invalid profile.followApproval payload: targetUserId");
  }

  var cursor = payload.cursor;
  if (cursor != null && (typeof cursor !== "string" || cursor.trim().length === 0)) {
    throw new Error("Invalid profile.followApproval payload: cursor");
  }

  return {
    targetUserId: payload.targetUserId.trim(),
    cursor: typeof cursor === "string" ? cursor.trim() : null,
  };
}

function decodeCursor(cursor: string | null): CursorQuery | null {
  if (!cursor) return null;

  try {
    var decoded = Buffer.from(cursor, "base64").toString("utf8");
    var parsed = JSON.parse(decoded) as Partial<FollowApprovalCursor> & {
      c?: string;
    };
    var cursorCreatedAt = parsed.createdAt ?? parsed["c"];

    if (typeof cursorCreatedAt !== "string" || typeof parsed.followerId !== "string") {
      throw new Error("invalid-shape");
    }

    var createdAt = new Date(cursorCreatedAt);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("invalid-date");
    }

    if (parsed.followerId.length === 0) {
      throw new Error("invalid-id");
    }

    return {
      createdAt,
      followerId: parsed.followerId,
    };
  } catch (_error) {
    throw new Error("Invalid follow-approval cursor");
  }
}

function encodeCursor(input: FollowApprovalCursor): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: input.createdAt,
      followerId: input.followerId,
    }),
    "utf8"
  ).toString("base64");
}

function followApprovalJobId(targetUserId: string, cursor: string | null): string {
  var cursorKey = cursor ? Buffer.from(cursor).toString("hex") : "start";
  return "profile.followApproval-" + targetUserId + "-" + cursorKey;
}

function toSet(values: string[]): string[] {
  var seen = new Set<string>();
  var out: string[] = [];

  for (var i = 0; i < values.length; i += 1) {
    var candidate = values[i];
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    out.push(candidate);
  }

  return out;
}

function addToActorIds(existing: string[] | null | undefined, nextActorId: string): string[] {
  var deduped = toSet(existing ?? []);
  var filtered = deduped.filter(function (candidate) {
    return candidate !== nextActorId;
  });
  filtered.unshift(nextActorId);
  return filtered.slice(0, 3);
}

function normalizeActorIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  var out: string[] = [];
  for (var i = 0; i < value.length; i += 1) {
    var candidate = value[i];
    if (typeof candidate === "string" && candidate.length > 0) {
      out.push(candidate);
    }
  }

  return out;
}

async function readPendingFollowRows(
  database: ProfileFollowApprovalDb,
  targetUserId: string,
  cursor: string | null
): Promise<{ rows: PendingFollowRow[]; hasMore: boolean; nextCursor: string | null }> {
  var parsedCursor = decodeCursor(cursor);
  var limit = getProfileFollowApprovalBatchSize();
  var pageSize = limit + 1;

  var whereCondition = and(
    eq(follows.followingId, targetUserId),
    eq(follows.status, "pending")
  );

  if (parsedCursor) {
    whereCondition = and(
      whereCondition,
      or(
        lt(follows.createdAt, parsedCursor.createdAt),
        and(eq(follows.createdAt, parsedCursor.createdAt), lt(follows.followerId, parsedCursor.followerId))
      )
    );
  }

  var rows = await database
    .select({
    followerId: follows.followerId,
      createdAt: follows.createdAt,
    })
    .from(follows)
    .where(whereCondition)
    .orderBy(desc(follows.createdAt), desc(follows.followerId))
    .limit(pageSize);

  var pageRows = rows.slice(0, limit);
  var hasMore = rows.length > limit;
  var tail = pageRows[pageRows.length - 1];

  return {
    rows: pageRows,
    hasMore,
    nextCursor: hasMore && tail
      ? encodeCursor({
          createdAt: tail.createdAt.toISOString(),
          followerId: tail.followerId,
        })
      : null,
  };
}

async function approvePendingFollows(
  database: ProfileFollowApprovalDb,
  targetUserId: string,
  followerIds: string[]
): Promise<string[]> {
  if (followerIds.length === 0) return [];

  var normalizedFollowerIds = toSet(followerIds);
  var rows = await database
    .update(follows)
    .set({ status: "accepted" })
    .where(
      and(
        eq(follows.followingId, targetUserId),
        eq(follows.status, "pending"),
        inArray(follows.followerId, normalizedFollowerIds)
      )
    )
    .returning();

  var approvedFollowerIds = new Array<string>();
  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    if (!row) continue;
    approvedFollowerIds.push(row.followerId);
  }

  return toSet(approvedFollowerIds);
}

async function writeCounterDeltas(database: ProfileFollowApprovalDb, payloads: CounterBatch[]): Promise<void> {
  if (payloads.length === 0) return;

  for (var i = 0; i < payloads.length; i += 1) {
    var payload = payloads[i];
    if (!payload) continue;

    if (!Number.isInteger(payload.delta) || payload.delta === 0) {
      throw new Error("Invalid counter delta");
    }
  }

  await database.insert(counterJobs).values(
    payloads.map(function (payload) {
      return {
        targetTable: payload.targetTable,
        targetId: payload.targetId,
        counterName: payload.counterName,
        delta: payload.delta,
      };
    })
  );

  for (var j = 0; j < payloads.length; j += 1) {
    var write = payloads[j];
    if (!write) continue;

    await database.insert(counterJobDeltas).values({
      targetTable: write.targetTable,
      targetId: write.targetId,
      counterName: write.counterName,
      delta: write.delta,
    }).onConflictDoUpdate({
      target: [
        counterJobDeltas.targetTable,
        counterJobDeltas.targetId,
        counterJobDeltas.counterName,
      ],
      set: {
        delta: sql`${counterJobDeltas.delta} + ${write.delta}`,
        updatedAt: new Date(),
      },
    });
  }

  await database.delete(counterJobDeltas).where(eq(counterJobDeltas.delta, 0));
}

async function resolveRecipientSettings(
  database: ProfileFollowApprovalDb,
  recipientIds: string[]
): Promise<Map<string, boolean>> {
  if (recipientIds.length === 0) return new Map();

  var rows = await database
    .select({
      userId: userSettings.userId,
      notifyNewFollowers: userSettings.notifyNewFollowers,
    })
    .from(userSettings)
    .where(inArray(userSettings.userId, recipientIds));

  var settings = new Map<string, boolean>();
  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    if (!row) continue;
    settings.set(row.userId, row.notifyNewFollowers ?? true);
  }

  return settings;
}

async function resolveNotificationSuppressedRecipients(
  database: ProfileFollowApprovalDb,
  actorId: string,
  recipientIds: string[]
): Promise<Set<string>> {
  if (recipientIds.length === 0) return new Set();

  var suppressed = new Set<string>();
  var blockedByActorRows = await database
    .select({ userId: userBlocks.blockedId })
    .from(userBlocks)
    .where(and(eq(userBlocks.blockerId, actorId), inArray(userBlocks.blockedId, recipientIds)));

  for (var i = 0; i < blockedByActorRows.length; i += 1) {
    var row = blockedByActorRows[i];
    if (row) suppressed.add(row.userId);
  }

  var blockedByRecipientRows = await database
    .select({ userId: userBlocks.blockerId })
    .from(userBlocks)
    .where(and(inArray(userBlocks.blockerId, recipientIds), eq(userBlocks.blockedId, actorId)));

  for (var j = 0; j < blockedByRecipientRows.length; j += 1) {
    var row = blockedByRecipientRows[j];
    if (row) suppressed.add(row.userId);
  }

  var mutedRows = await database
    .select({ userId: userMutes.mutedId })
    .from(userMutes)
    .where(and(eq(userMutes.muterId, actorId), inArray(userMutes.mutedId, recipientIds)));

  for (var k = 0; k < mutedRows.length; k += 1) {
    var row = mutedRows[k];
    if (row) suppressed.add(row.userId);
  }

  return suppressed;
}

function isNotificationEnabled(
  recipientId: string,
  settingsByRecipient: Map<string, boolean>,
  suppressed: Set<string>
): boolean {
  if (suppressed.has(recipientId)) return false;
  return settingsByRecipient.get(recipientId) ?? true;
}

async function writeFollowRequestNotifications(
  database: ProfileFollowApprovalDb,
  queue: Queue,
  actorId: string,
  recipientIds: string[]
): Promise<void> {
  var recipientIdsDeduped = toSet(recipientIds);
  if (recipientIdsDeduped.length === 0) return;

  var settings = await resolveRecipientSettings(database, recipientIdsDeduped);
  var suppressed = await resolveNotificationSuppressedRecipients(database, actorId, recipientIdsDeduped);

  var ready: string[] = [];
  for (var i = 0; i < recipientIdsDeduped.length; i += 1) {
    if (isNotificationEnabled(recipientIdsDeduped[i], settings, suppressed)) {
      ready.push(recipientIdsDeduped[i]);
    }
  }
  if (ready.length === 0) return;

  var existingRows = await database
    .select({
      id: notifications.id,
      actorId: notifications.actorId,
      actorIds: notifications.actorIds,
      recipientId: notifications.recipientId,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.type, "follow_request_approved"),
        eq(notifications.isRead, false),
        eq(notifications.entityType, "user"),
        eq(notifications.entityId, actorId),
        inArray(notifications.recipientId, ready)
      )
    );

  var existingByRecipient = new Map<string, NotificationActorRow & { id: string }>();
  for (var j = 0; j < existingRows.length; j += 1) {
    var existingRow = existingRows[j];
    if (!existingRow) continue;
    existingByRecipient.set(existingRow.recipientId, {
      id: existingRow.id,
      actorId: existingRow.actorId,
      actorIds: existingRow.actorIds,
    });
  }

  var notificationIds: string[] = [];

  for (var k = 0; k < ready.length; k += 1) {
    var recipientId = ready[k];
    if (!recipientId) continue;

    var existing = existingByRecipient.get(recipientId);
    if (existing) {
      await database
        .update(notifications)
        .set({
          actorId,
          actorIds: addToActorIds(normalizeActorIds(existing.actorIds), actorId),
          bundleCount: sql`${notifications.bundleCount} + 1`,
          createdAt: new Date(),
        })
        .where(eq(notifications.id, existing.id));

      notificationIds.push(existing.id);
      continue;
    }

    var inserted = await database
      .insert(notifications)
      .values({
        recipientId,
        actorId,
        actorIds: [actorId],
        type: "follow_request_approved",
        entityType: "user",
        entityId: actorId,
        bundleCount: 1,
      })
      .returning();

    if (inserted.length > 0 && inserted[0]?.id) {
      notificationIds.push(inserted[0].id);
    }
  }

  for (var n = 0; n < notificationIds.length; n += 1) {
    var notificationId = notificationIds[n];
    if (!notificationId) continue;

    await queue.add("notification.publish", { notificationId }, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: true,
      removeOnFail: 500,
    });
  }
}

function buildCounterRows(targetUserId: string, approvedFollowerIds: string[]): CounterBatch[] {
  if (approvedFollowerIds.length === 0) return [];

  var payloads: CounterBatch[] = [
    {
      targetTable: "profiles",
      targetId: targetUserId,
      counterName: "followerCount",
      delta: approvedFollowerIds.length,
    },
  ];

  for (var i = 0; i < approvedFollowerIds.length; i += 1) {
    var followerId = approvedFollowerIds[i];
    if (!followerId) continue;

    payloads.push({
      targetTable: "profiles",
      targetId: followerId,
      counterName: "followingCount",
      delta: 1,
    });
  }

  return payloads;
}

export async function runProfileFollowApprovalJob(
  payloadValue: unknown,
  queue: Queue,
  options: {
    enqueueCursorJobs?: boolean;
  } = {}
): Promise<{ approved: number; hasMore: boolean; nextCursor: string | null }> {
  var payload = parsePayload(payloadValue);
  var enqueueCursorJobs = options.enqueueCursorJobs !== false;
  var database = getDb();
  var page = await readPendingFollowRows(database, payload.targetUserId, payload.cursor);

  if (page.rows.length === 0) {
    return {
      approved: 0,
      hasMore: false,
      nextCursor: null,
    };
  }

  var followerIds = toSet(
    page.rows.map(function (row) {
      return row.followerId;
    })
  );

  var approvedFollowerIds: string[] = [];

  if (isPooledDb(database)) {
    await (database as PooledProfileFollowApprovalDb).transaction(async function (tx) {
      var writeDatabase = tx as unknown as ProfileFollowApprovalDb;

      approvedFollowerIds = await approvePendingFollows(writeDatabase, payload.targetUserId, followerIds);
      if (approvedFollowerIds.length > 0) {
        await writeCounterDeltas(writeDatabase, buildCounterRows(payload.targetUserId, approvedFollowerIds));
      }
    });
  } else {
    approvedFollowerIds = await approvePendingFollows(database, payload.targetUserId, followerIds);
    if (approvedFollowerIds.length > 0) {
      await writeCounterDeltas(database, buildCounterRows(payload.targetUserId, approvedFollowerIds));
    }
  }

  if (approvedFollowerIds.length > 0) {
    await writeFollowRequestNotifications(database, queue, payload.targetUserId, approvedFollowerIds);
  }

  if (enqueueCursorJobs && page.hasMore && page.nextCursor) {
    await queue.add(
      "profile.followApproval",
      {
        targetUserId: payload.targetUserId,
        cursor: page.nextCursor,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1_000,
        },
        removeOnComplete: true,
        removeOnFail: 500,
        jobId: followApprovalJobId(payload.targetUserId, page.nextCursor),
      }
    );
  }

  return {
    approved: approvedFollowerIds.length,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
  };
}
