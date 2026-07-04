import { Hono } from "hono";
import type { Context } from "hono";
import cassandra from "cassandra-driver";
import { and, desc, eq, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  chatMemberState,
  chatParticipants,
  chatThreadMeta,
  chatThreads,
  profiles,
  userSettings,
  userBlocks,
  users,
} from "@35mm/db/schema";
import type {
  ChatInboxPage,
  ChatMessagesPage,
  ChatMember,
  ChatMessage,
  ChatMessageContentType,
  ChatPresenceBatchResponse,
  ChatReadReceiptsResponse,
  ChatThreadPreview,
  ChatTypingSnapshot,
  MessageReaction,
  MessageReplySnapshot,
} from "@35mm/types";
import {
  createChatThreadSchema,
  chatPresenceBatchSchema,
  editMessageSchema,
  inboxCursorSchema,
  messageCursorSchema,
  messageReactionSchema,
  sendMessageSchema,
  typingIndicatorSchema,
} from "@35mm/validators";
import { getDb, getWriteDb } from "../../lib/db.js";
import { ApiError, badRequest, forbidden } from "../../lib/errors.js";
import { requireAuth, type AuthUser } from "../../lib/middleware.js";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import { createRateLimitMiddleware } from "../../lib/rateLimit.js";
import { createUlid } from "../../lib/ulid.js";
import { tryGetKeyspacesClient } from "../../lib/keyspaces.js";
import { enqueueChatJob } from "../../lib/jobs.js";
import { createNotification } from "../../lib/notifications.js";
import {
  clearTyping,
  getActivityVisibilityCache,
  getPresenceStates,
  getTypingUsers,
  getUnreadCounts,
  getUnreadCountsForPairs,
  incrementUnread,
  resetUnread,
  setActivityVisibilityCache,
  setPresence,
  setTyping,
} from "./chatRedis.js";
import { getMessageBucket, truncatePreview } from "./chatUtils.js";
import {
  publishChatMessageCreated,
  publishChatInboxThreadUpdated,
  publishChatMessageUpdated,
  publishChatReadReceipt,
  publishChatTyping,
} from "./realtime.js";

type ProfileRow = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarVariants: Record<string, string> | null;
};

type MessageRow = {
  thread_id: string;
  bucket: number;
  message_id: { toString(): string; getDate?: () => Date };
  sender_id: string;
  content_type: ChatMessageContentType;
  body: string | null;
  media_url: string | null;
  media_meta: string | null;
  link_preview: string | null;
  reply_to_id: { toString(): string } | null;
  reply_snapshot: string | null;
  reactions: unknown;
  is_deleted: boolean | null;
  deleted_at: Date | null;
  edited_at: Date | null;
  created_at: Date | null;
};

export var chatRoutes = new Hono();
chatRoutes.use("*", requireAuth);

type MessageBucketFetcher = (params: {
  bucket: number;
  before: cassandra.types.TimeUuid | null;
  limit: number;
}) => Promise<MessageRow[]>;

export function messageBucketsNewestFirst(startBucket: number, maxBuckets = 12): number[] {
  var buckets: number[] = [];
  var year = Math.floor(startBucket / 100);
  var month = startBucket % 100;
  for (var i = 0; i < maxBuckets; i += 1) {
    buckets.push(year * 100 + month);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return buckets;
}

export async function fetchChatMessages(
  threadId: string,
  before: cassandra.types.TimeUuid | null,
  limit: number,
  fetchBucket: MessageBucketFetcher,
  now: Date
): Promise<{ rows: MessageRow[]; hasMore: boolean }> {
  var rows: MessageRow[] = [];
  var startBucket = before ? getMessageBucket(before.getDate()) : getMessageBucket(now);
  var buckets = messageBucketsNewestFirst(startBucket);
  for (var i = 0; i < buckets.length; i += 1) {
    var remaining = limit + 1 - rows.length;
    if (remaining <= 0) break;
    var bucket = buckets[i];
    var bucketRows = await fetchBucket({
      bucket,
      before: i === 0 ? before : null,
      limit: remaining,
    });
    rows.push(...bucketRows);
    if (rows.length > limit) break;
  }
  return {
    rows: rows.slice(0, Math.max(0, limit)),
    hasMore: rows.length > limit,
  };
}

function userRateLimit(keyPrefix: string, limit: number, windowSeconds: number) {
  return createRateLimitMiddleware({
    keyPrefix,
    limit,
    windowSeconds,
    identify: function (c) {
      var user = c.get("user") as AuthUser | undefined;
      return user?.userId ?? null;
    },
  });
}

var inboxRateLimit = userRateLimit("chat:inbox", 60, 60);
var createThreadRateLimit = userRateLimit("chat:create-thread", 10, 60);
var readMessagesRateLimit = userRateLimit("chat:read-messages", 120, 60);
var sendMessageRateLimit = userRateLimit("chat:send-message", 30, 60);
var messageWriteRateLimit = userRateLimit("chat:message-write", 30, 60);
var reactionRateLimit = userRateLimit("chat:reaction", 60, 60);
var readStateRateLimit = userRateLimit("chat:read-state", 120, 60);
var threadStateRateLimit = userRateLimit("chat:thread-state", 60, 60);
var typingRateLimit = userRateLimit("chat:typing", 30, 60);
var presenceRateLimit = userRateLimit("chat:presence", 4, 60);
var presenceBatchRateLimit = userRateLimit("chat:presence-batch", 120, 60);

function parseJson<T>(schema: { parse(value: unknown): T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    var message =
      error &&
      typeof error === "object" &&
      Array.isArray((error as { issues?: unknown }).issues)
        ? ((error as { issues: Array<{ message?: string }> }).issues[0]?.message ?? "Invalid request")
        : "Invalid request";
    throw badRequest(message);
  }
}

function authUser(c: Context): AuthUser {
  return c.get("user") as AuthUser;
}

function apiError(status: number, code: string, message: string): ApiError {
  return new ApiError(status, code, message);
}

function asRecord(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  var out: Record<string, string> = {};
  for (var [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") out[key] = raw;
  }
  return out;
}

function parseJsonObject<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    var parsed = JSON.parse(value) as T;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  var typed = error as { code?: unknown; cause?: { code?: unknown } };
  if (typeof typed.code === "string" && typed.code === "23505") return true;
  return typeof typed.cause?.code === "string" && typed.cause.code === "23505";
}

function timeUuidFromString(value: string): cassandra.types.TimeUuid {
  try {
    return cassandra.types.TimeUuid.fromString(value);
  } catch {
    throw badRequest("Invalid message id");
  }
}

function bucketFromMessageId(messageId: string): number {
  return getMessageBucket(timeUuidFromString(messageId).getDate());
}

function reactionEntries(value: unknown): Array<[string, string[]]> {
  if (!value) return [];
  if (value instanceof Map) {
    return Array.from(value.entries()).map(function ([emoji, raw]) {
      var userIds = raw instanceof Set ? Array.from(raw) : Array.isArray(raw) ? raw : [];
      return [String(emoji), userIds.map(String)];
    });
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(function ([emoji, raw]) {
      var userIds = raw instanceof Set ? Array.from(raw) : Array.isArray(raw) ? raw : [];
      return [emoji, userIds.map(String)];
    });
  }
  return [];
}

function hydrateReactions(value: unknown, viewerId: string): MessageReaction[] {
  return reactionEntries(value).map(function ([emoji, userIds]) {
    return {
      emoji,
      count: userIds.length,
      userIds: userIds.slice(0, 10),
      viewerReacted: userIds.includes(viewerId),
    };
  });
}

function reactionUserSet(value: unknown, emoji: string): Set<string> {
  var entry = reactionEntries(value).find(function ([candidate]) {
    return candidate === emoji;
  });
  return new Set(entry?.[1] ?? []);
}

function setReactionEntry(value: unknown, emoji: string, userIds: Set<string>): Record<string, string[]> {
  var map: Record<string, string[]> = {};
  for (var [candidate, existing] of reactionEntries(value)) {
    if (candidate !== emoji) map[candidate] = existing;
  }
  if (userIds.size > 0) map[emoji] = Array.from(userIds);
  return map;
}

function messageDate(row: MessageRow): Date {
  if (row.created_at) return row.created_at;
  var fromId = row.message_id.getDate?.();
  return fromId ?? new Date();
}

function hydrateMessage(
  row: MessageRow,
  profileMap: Map<string, ProfileRow>,
  viewerId: string
): ChatMessage {
  var profile = profileMap.get(row.sender_id);
  var isDeleted = Boolean(row.is_deleted);
  return {
    id: row.message_id.toString(),
    threadId: row.thread_id,
    bucket: row.bucket,
    senderId: row.sender_id,
    senderUsername: profile?.username ?? "unknown",
    senderDisplayName: profile?.displayName ?? "Unknown User",
    senderAvatarUrl: profile?.avatarUrl ?? null,
    senderAvatarVariants: profile?.avatarVariants ?? null,
    contentType: row.content_type,
    body: isDeleted ? null : row.body,
    mediaUrl: isDeleted ? null : row.media_url,
    mediaMetadata: isDeleted
      ? null
      : parseJsonObject<ChatMessage["mediaMetadata"]>(row.media_meta),
    linkPreview: isDeleted
      ? null
      : parseJsonObject<ChatMessage["linkPreview"]>(row.link_preview),
    replyToId: row.reply_to_id?.toString() ?? null,
    replySnapshot: parseJsonObject<MessageReplySnapshot>(row.reply_snapshot),
    reactions: hydrateReactions(row.reactions, viewerId),
    isDeleted,
    editedAt: row.edited_at?.toISOString() ?? null,
    createdAt: messageDate(row).toISOString(),
  };
}

function rowFromKeyspaces(input: unknown): MessageRow {
  var row = input as { get?: (name: string) => unknown } & Record<string, unknown>;
  function value(name: string): unknown {
    return typeof row.get === "function" ? row.get(name) : row[name];
  }
  return {
    thread_id: String(value("thread_id")),
    bucket: Number(value("bucket")),
    message_id: value("message_id") as MessageRow["message_id"],
    sender_id: String(value("sender_id")),
    content_type: String(value("content_type")) as ChatMessageContentType,
    body: (value("body") as string | null) ?? null,
    media_url: (value("media_url") as string | null) ?? null,
    media_meta: (value("media_meta") as string | null) ?? null,
    link_preview: (value("link_preview") as string | null) ?? null,
    reply_to_id: (value("reply_to_id") as MessageRow["reply_to_id"]) ?? null,
    reply_snapshot: (value("reply_snapshot") as string | null) ?? null,
    reactions: value("reactions"),
    is_deleted: (value("is_deleted") as boolean | null) ?? false,
    deleted_at: (value("deleted_at") as Date | null) ?? null,
    edited_at: (value("edited_at") as Date | null) ?? null,
    created_at: (value("created_at") as Date | null) ?? null,
  };
}

async function fetchProfiles(userIds: string[]): Promise<Map<string, ProfileRow>> {
  var unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return new Map();
  var rows = await getDb()
    .select({
      userId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
    })
    .from(profiles)
    .where(inArray(profiles.userId, unique));
  var map = new Map<string, ProfileRow>();
  for (var row of rows) {
    map.set(row.userId, {
      ...row,
      avatarVariants: asRecord(row.avatarVariants),
    });
  }
  return map;
}

async function fetchThreadMembers(threadIds: string[]): Promise<Map<string, ChatMember[]>> {
  if (threadIds.length === 0) return new Map();
  var rows = await getDb()
    .select({
      threadId: chatParticipants.threadId,
      userId: chatParticipants.userId,
      role: chatParticipants.role,
      joinedAt: chatParticipants.joinedAt,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
    })
    .from(chatParticipants)
    .innerJoin(profiles, eq(profiles.userId, chatParticipants.userId))
    .where(and(inArray(chatParticipants.threadId, threadIds), isNull(chatParticipants.leftAt)));
  var out = new Map<string, ChatMember[]>();
  for (var row of rows) {
    var list = out.get(row.threadId) ?? [];
    list.push({
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      avatarVariants: asRecord(row.avatarVariants),
      role: row.role === "admin" ? "admin" : "member",
      joinedAt: row.joinedAt.toISOString(),
    });
    out.set(row.threadId, list);
  }
  return out;
}

async function assertActiveMember(threadId: string, userId: string) {
  var rows = await getDb()
    .select({
      threadId: chatParticipants.threadId,
      deletedAt: chatMemberState.deletedAt,
    })
    .from(chatParticipants)
    .leftJoin(
      chatMemberState,
      and(
        eq(chatMemberState.threadId, chatParticipants.threadId),
        eq(chatMemberState.userId, chatParticipants.userId)
      )
    )
    .where(
      and(
        eq(chatParticipants.threadId, threadId),
        eq(chatParticipants.userId, userId),
        isNull(chatParticipants.leftAt)
      )
    )
    .limit(1);
  if (rows.length === 0) throw apiError(403, "NOT_MEMBER", "Not a member of this thread");
  return rows[0];
}

async function isActiveThreadMember(threadId: string, userId: string): Promise<boolean> {
  var rows = await getDb()
    .select({ threadId: chatParticipants.threadId })
    .from(chatParticipants)
    .where(
      and(
        eq(chatParticipants.threadId, threadId),
        eq(chatParticipants.userId, userId),
        isNull(chatParticipants.leftAt)
      )
    )
    .limit(1);
  return rows.length > 0;
}

async function createChatReactionNotification(input: {
  threadId: string;
  messageId: string;
  actorId: string;
  recipientId: string;
}): Promise<void> {
  if (input.actorId === input.recipientId) return;
  if (!(await isActiveThreadMember(input.threadId, input.recipientId))) return;

  try {
    await createNotification({
      recipientId: input.recipientId,
      actorId: input.actorId,
      type: "chat_reaction",
      entityType: "chat_thread",
      entityId: input.threadId,
    });
  } catch (error) {
    console.warn("[chat.notifications] reaction notification failed", {
      threadId: input.threadId,
      messageId: input.messageId,
      actorId: input.actorId,
      recipientId: input.recipientId,
      error,
    });
  }
}

async function publishChatReactionUnread(input: {
  threadId: string;
  actorId: string;
  recipientId: string;
  emoji: string;
}): Promise<{
  preview: string;
  reactedAt: string;
  inboxPublished: boolean;
} | null> {
  if (input.actorId === input.recipientId) return null;
  if (!(await isActiveThreadMember(input.threadId, input.recipientId))) return null;

  var now = new Date();
  var preview = input.emoji + " Reacted to your message";
  await getDb()
    .insert(chatThreadMeta)
    .values({
      threadId: input.threadId,
      lastMessageAt: now,
      lastMessagePreview: preview,
      lastSenderId: input.actorId,
      messageCount: 0,
    })
    .onConflictDoUpdate({
      target: chatThreadMeta.threadId,
      set: {
        lastMessageAt: now,
        lastMessagePreview: preview,
        lastSenderId: input.actorId,
      },
    });
  await incrementUnread(input.recipientId, input.threadId);
  var unreadCounts = await getUnreadCountsForPairs([
    { userId: input.recipientId, threadId: input.threadId },
  ]);
  var unreadCount = unreadCounts[input.recipientId + ":" + input.threadId] ?? 0;
  var inboxPublished = await publishChatInboxThreadUpdated({
    recipientId: input.recipientId,
    threadId: input.threadId,
    lastMessageAt: now.toISOString(),
    lastMessagePreview: preview,
    senderId: input.actorId,
    unreadCount,
  });
  return {
    preview,
    reactedAt: now.toISOString(),
    inboxPublished,
  };
}

async function getThreadPreview(threadId: string, viewerId: string): Promise<ChatThreadPreview> {
  var rows = await getDb()
    .select({
      id: chatThreads.id,
      type: chatThreads.type,
      lastMessageAt: chatMemberState.lastMessageAt,
      lastMessagePreview: chatThreadMeta.lastMessagePreview,
      lastSenderId: chatThreadMeta.lastSenderId,
      archivedAt: chatMemberState.archivedAt,
      deletedAt: chatMemberState.deletedAt,
      mutedUntil: chatMemberState.mutedUntil,
    })
    .from(chatThreads)
    .leftJoin(chatThreadMeta, eq(chatThreadMeta.threadId, chatThreads.id))
    .leftJoin(
      chatMemberState,
      and(eq(chatMemberState.threadId, chatThreads.id), eq(chatMemberState.userId, viewerId))
    )
    .where(eq(chatThreads.id, threadId))
    .limit(1);
  if (rows.length === 0) throw apiError(404, "THREAD_NOT_FOUND", "Thread not found");
  var memberMap = await fetchThreadMembers([threadId]);
  var members = memberMap.get(threadId) ?? [];
  if (rows[0].type === "dm") {
    members = members.filter(function (member) {
      return member.userId !== viewerId;
    });
  }
  var unread = await getUnreadCounts(viewerId, [threadId]);
  return {
    id: rows[0].id,
    type: rows[0].type === "group" ? "group" : "dm",
    members,
    lastMessageAt: rows[0].lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: rows[0].lastMessagePreview,
    lastSenderId: rows[0].lastSenderId,
    unreadCount: unread[threadId] ?? 0,
    isArchived: rows[0].archivedAt != null,
    isMuted: rows[0].mutedUntil != null && rows[0].mutedUntil > new Date(),
    deletedAt: rows[0].deletedAt?.toISOString() ?? null,
  };
}

async function fetchMessage(threadId: string, bucket: number, messageId: string): Promise<MessageRow | null> {
  var client = tryGetKeyspacesClient();
  if (!client) throw apiError(503, "KEYSPACES_UNAVAILABLE", "Keyspaces unavailable");
  var result = await client.execute(
    "SELECT * FROM messages WHERE thread_id = ? AND bucket = ? AND message_id = ?",
    [threadId, bucket, timeUuidFromString(messageId)],
    { executionProfile: "chat-read" }
  );
  if (result.rows.length === 0) return null;
  return rowFromKeyspaces(result.rows[0]);
}

chatRoutes.get("/inbox", inboxRateLimit, async function (c) {
  var viewer = authUser(c);
  var query = parseJson(inboxCursorSchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });
  var cursor = decodeCompositeCursor(query.cursor);
  var limitPlus = query.limit + 1;
  var rows = await getDb()
    .select({
      id: chatThreads.id,
      type: chatThreads.type,
      lastMessageAt: chatMemberState.lastMessageAt,
      lastMessagePreview: chatThreadMeta.lastMessagePreview,
      lastSenderId: chatThreadMeta.lastSenderId,
      archivedAt: chatMemberState.archivedAt,
      deletedAt: chatMemberState.deletedAt,
      mutedUntil: chatMemberState.mutedUntil,
    })
    .from(chatParticipants)
    .innerJoin(chatThreads, eq(chatThreads.id, chatParticipants.threadId))
    .leftJoin(chatThreadMeta, eq(chatThreadMeta.threadId, chatThreads.id))
    .leftJoin(
      chatMemberState,
      and(
        eq(chatMemberState.threadId, chatThreads.id),
        eq(chatMemberState.userId, viewer.userId)
      )
    )
    .where(
      and(
        eq(chatParticipants.userId, viewer.userId),
        isNull(chatParticipants.leftAt),
        isNull(chatMemberState.deletedAt),
        cursor
          ? or(
              lt(chatMemberState.lastMessageAt, cursor.createdAt),
              and(eq(chatMemberState.lastMessageAt, cursor.createdAt), lt(chatThreads.id, cursor.id))
            )
          : sql`true`
      )
    )
    .orderBy(desc(chatMemberState.lastMessageAt), desc(chatThreads.id))
    .limit(limitPlus);

  var pageRows = rows.slice(0, query.limit);
  var memberMap = await fetchThreadMembers(pageRows.map(function (row) {
    return row.id;
  }));
  var unread = await getUnreadCounts(viewer.userId, pageRows.map(function (row) {
    return row.id;
  }));
  var items: ChatThreadPreview[] = pageRows.map(function (row) {
    var members = memberMap.get(row.id) ?? [];
    if (row.type === "dm") {
      members = members.filter(function (member) {
        return member.userId !== viewer.userId;
      });
    }
    return {
      id: row.id,
      type: row.type === "group" ? "group" : "dm",
      members,
      lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
      lastMessagePreview: row.lastMessagePreview,
      lastSenderId: row.lastSenderId,
      unreadCount: unread[row.id] ?? 0,
      isArchived: row.archivedAt != null,
      isMuted: row.mutedUntil != null && row.mutedUntil > new Date(),
      deletedAt: row.deletedAt?.toISOString() ?? null,
    };
  });
  var last = pageRows[pageRows.length - 1];
  var response: ChatInboxPage = {
    items,
    hasMore: rows.length > query.limit,
    nextCursor: rows.length > query.limit && last?.lastMessageAt
      ? encodeCompositeCursor({ createdAt: last.lastMessageAt, id: last.id })
      : null,
  };
  return c.json(response);
});

chatRoutes.post("/threads", createThreadRateLimit, async function (c) {
  var viewer = authUser(c);
  var body = parseJson(createChatThreadSchema, await c.req.json());
  var memberIds = Array.from(new Set(body.memberIds.filter(function (id) {
    return id !== viewer.userId;
  })));
  if (body.type === "dm" && memberIds.length !== 1) {
    throw badRequest("DM threads require exactly one other member");
  }
  var allMemberIds = [viewer.userId, ...memberIds];
  var dmMemberLow = "";
  var dmMemberHigh = "";
  var existingUsers = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, allMemberIds));
  if (existingUsers.length !== allMemberIds.length) {
    throw badRequest("One or more members do not exist");
  }
  var blockRows = memberIds.length > 0
    ? await getDb()
        .select({ blockerId: userBlocks.blockerId })
        .from(userBlocks)
        .where(
          or(
            and(eq(userBlocks.blockerId, viewer.userId), inArray(userBlocks.blockedId, memberIds)),
            and(inArray(userBlocks.blockerId, memberIds), eq(userBlocks.blockedId, viewer.userId))
          )
        )
        .limit(1)
    : [];
  if (blockRows.length > 0) throw apiError(403, "BLOCKED_USER", "Blocked user");

  if (body.type === "dm") {
    var partnerId = memberIds[0];
    if (viewer.userId < partnerId) {
      dmMemberLow = viewer.userId;
      dmMemberHigh = partnerId;
    } else {
      dmMemberLow = partnerId;
      dmMemberHigh = viewer.userId;
    }
    var viewerParticipant = alias(chatParticipants, "viewerParticipant");
    var partnerParticipant = alias(chatParticipants, "partnerParticipant");
    var existingDmByPairRows = await getDb()
      .select({ threadId: chatThreads.id })
      .from(chatThreads)
      .innerJoin(
        viewerParticipant,
        and(
          eq(viewerParticipant.threadId, chatThreads.id),
          eq(viewerParticipant.userId, viewer.userId),
          isNull(viewerParticipant.leftAt)
        )
      )
      .innerJoin(
        partnerParticipant,
        and(
          eq(partnerParticipant.threadId, chatThreads.id),
          eq(partnerParticipant.userId, partnerId),
          isNull(partnerParticipant.leftAt)
        )
      )
      .where(
        and(
          eq(chatThreads.type, "dm"),
          eq(chatThreads.dmMemberLow, dmMemberLow),
          eq(chatThreads.dmMemberHigh, dmMemberHigh)
        )
      )
      .limit(1);
    if (existingDmByPairRows.length > 0) {
      return c.json(await getThreadPreview(existingDmByPairRows[0].threadId, viewer.userId), 200);
    }
  }

  var now = new Date();
  var threadId = createUlid();
  var isNewThread = true;
  try {
    await getWriteDb().transaction(async function (tx) {
      var insertedThreadRows = await tx
        .insert(chatThreads)
        .values({
          id: threadId,
          type: body.type,
          createdBy: viewer.userId,
          ...(body.type === "dm"
            ? {
                dmMemberLow,
                dmMemberHigh,
              }
            : {}),
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: chatThreads.id })
        .onConflictDoNothing();

      if (insertedThreadRows.length === 0) {
        if (body.type !== "dm") {
          throw apiError(409, "THREAD_CREATE_CONFLICT", "Could not create thread");
        }

        var conflictingDmRows = await tx
          .select({ id: chatThreads.id })
          .from(chatThreads)
          .where(
            and(
              eq(chatThreads.type, "dm"),
              eq(chatThreads.dmMemberLow, dmMemberLow),
              eq(chatThreads.dmMemberHigh, dmMemberHigh)
            )
          )
          .limit(1);
        if (conflictingDmRows.length === 0) {
          throw apiError(409, "THREAD_CREATE_CONFLICT", "Could not create DM thread");
        }
        threadId = conflictingDmRows[0].id;
        isNewThread = false;
      } else {
        threadId = insertedThreadRows[0].id;
      }

      await tx
        .insert(chatParticipants)
        .values(
          allMemberIds.map(function (userId) {
            return {
              threadId,
              userId,
              joinedAt: now,
              role: body.type === "group" && userId === viewer.userId ? "admin" : "member",
            };
          })
        )
        .onConflictDoNothing();
      await tx
        .insert(chatMemberState)
        .values(
          allMemberIds.map(function (userId) {
            return { threadId, userId };
          })
        )
        .onConflictDoNothing();
      await tx.insert(chatThreadMeta).values({ threadId, messageCount: 0 }).onConflictDoNothing();
    });
  } catch (error) {
    if (body.type !== "dm" || !isUniqueConstraintError(error)) throw error;
    var conflictingDmRows = await getDb()
      .select({ id: chatThreads.id })
      .from(chatThreads)
      .where(
        and(
          eq(chatThreads.type, "dm"),
          eq(chatThreads.dmMemberLow, dmMemberLow),
          eq(chatThreads.dmMemberHigh, dmMemberHigh)
        )
      )
      .limit(1);
    if (conflictingDmRows.length === 0) throw error;
    return c.json(await getThreadPreview(conflictingDmRows[0].id, viewer.userId), 200);
  }
  return c.json(await getThreadPreview(threadId, viewer.userId), isNewThread ? 201 : 200);
});

chatRoutes.get("/threads/:threadId/messages", readMessagesRateLimit, async function (c) {
  var viewer = authUser(c);
  var threadId = c.req.param("threadId");
  var query = parseJson(messageCursorSchema, {
    before: c.req.query("before"),
    limit: c.req.query("limit"),
  });
  await assertActiveMember(threadId, viewer.userId);
  var client = tryGetKeyspacesClient();
  if (!client) {
    console.warn("[chat] Keyspaces unavailable; returning empty messages page", { threadId });
    return c.json({ items: [], nextCursor: null, hasMore: false } satisfies ChatMessagesPage);
  }
  var keyspacesClient = client;
  var before = query.before ? timeUuidFromString(query.before) : null;
  var messageRows = await fetchChatMessages(
    threadId,
    before,
    query.limit,
    async function (params) {
      var cql = params.before
        ? "SELECT * FROM messages WHERE thread_id = ? AND bucket = ? AND message_id < ? ORDER BY message_id DESC LIMIT ?"
        : "SELECT * FROM messages WHERE thread_id = ? AND bucket = ? ORDER BY message_id DESC LIMIT ?";
      var paramsWithCursor = params.before
        ? [threadId, params.bucket, params.before, params.limit]
        : [threadId, params.bucket, params.limit];
      var result = await keyspacesClient.execute(cql, paramsWithCursor, { executionProfile: "chat-read" });
      return result.rows.map(rowFromKeyspaces);
    },
    new Date()
  );
  var pageRows = messageRows.rows;
  var profileMap = await fetchProfiles(pageRows.map(function (row) {
    return row.sender_id;
  }));
  var items = pageRows.map(function (row) {
    return hydrateMessage(row, profileMap, viewer.userId);
  });
  return c.json({
    items,
    hasMore: messageRows.hasMore,
    nextCursor: messageRows.hasMore ? items[items.length - 1]?.id ?? null : null,
  });
});

chatRoutes.post("/threads/:threadId/messages", sendMessageRateLimit, async function (c) {
  var viewer = authUser(c);
  var threadId = c.req.param("threadId");
  var body = parseJson(sendMessageSchema, await c.req.json());
  var membership = await assertActiveMember(threadId, viewer.userId);
  if (membership.deletedAt) throw forbidden("Thread deleted for this member");
  var client = tryGetKeyspacesClient();
  if (!client) throw apiError(503, "KEYSPACES_UNAVAILABLE", "Keyspaces unavailable");
  var replySnapshot: MessageReplySnapshot | null = null;
  var replyToUuid: cassandra.types.TimeUuid | null = null;
  if (body.replyToId) {
    replyToUuid = timeUuidFromString(body.replyToId);
    var replyRow = await fetchMessage(threadId, getMessageBucket(replyToUuid.getDate()), body.replyToId);
    if (!replyRow) throw apiError(404, "MESSAGE_NOT_FOUND", "Message not found");
    var profileMap = await fetchProfiles([replyRow.sender_id]);
    replySnapshot = {
      senderId: replyRow.sender_id,
      senderUsername: profileMap.get(replyRow.sender_id)?.username ?? "unknown",
      body: replyRow.body ? replyRow.body.slice(0, 300) : null,
      contentType: replyRow.content_type,
    };
  }
  var now = new Date();
  var messageId = cassandra.types.TimeUuid.now();
  var bucket = getMessageBucket(now);
  await client.execute(
    `INSERT INTO messages
      (thread_id, bucket, message_id, sender_id, content_type, body, media_url, media_meta,
       link_preview, reply_to_id, reply_snapshot, reactions, is_deleted, deleted_at, edited_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      threadId,
      bucket,
      messageId,
      viewer.userId,
      body.contentType,
      body.body ?? null,
      body.mediaUrl ?? null,
      body.mediaMetadata ? JSON.stringify(body.mediaMetadata) : null,
      body.linkPreview ? JSON.stringify(body.linkPreview) : null,
      replyToUuid,
      replySnapshot ? JSON.stringify(replySnapshot) : null,
      {},
      false,
      null,
      null,
      now,
    ],
    { executionProfile: "chat-write" }
  );
  await getDb()
    .insert(chatThreadMeta)
    .values({
      threadId,
      lastMessageAt: now,
      lastMessagePreview: truncatePreview(body.body ?? null, body.contentType),
      lastSenderId: viewer.userId,
      messageCount: 1,
    })
    .onConflictDoUpdate({
      target: chatThreadMeta.threadId,
      set: {
        lastMessageAt: now,
        lastMessagePreview: truncatePreview(body.body ?? null, body.contentType),
        lastSenderId: viewer.userId,
        messageCount: sql`${chatThreadMeta.messageCount} + 1`,
      },
    });
  await getDb()
    .update(chatMemberState)
    .set({ lastMessageAt: now })
    .where(eq(chatMemberState.threadId, threadId));
  var members = await fetchThreadMembers([threadId]);
  var activeMembers = members.get(threadId) ?? [];
  for (var member of activeMembers) {
    if (member.userId !== viewer.userId) await incrementUnread(member.userId, threadId);
  }
  await clearTyping(threadId, viewer.userId);
  var profileMap = await fetchProfiles([viewer.userId]);
  var message = hydrateMessage(
    rowFromKeyspaces({
      thread_id: threadId,
      bucket,
      message_id: messageId,
      sender_id: viewer.userId,
      content_type: body.contentType,
      body: body.body ?? null,
      media_url: body.mediaUrl ?? null,
      media_meta: body.mediaMetadata ? JSON.stringify(body.mediaMetadata) : null,
      link_preview: body.linkPreview ? JSON.stringify(body.linkPreview) : null,
      reply_to_id: replyToUuid,
      reply_snapshot: replySnapshot ? JSON.stringify(replySnapshot) : null,
      reactions: {},
      is_deleted: false,
      created_at: now,
    }),
    profileMap,
    viewer.userId
  );
  var unreadCounts = await getUnreadCountsForPairs(
    activeMembers
      .filter(function (member) {
        return member.userId !== viewer.userId;
      })
      .map(function (member) {
        return { userId: member.userId, threadId };
      })
  );
  var realtime = await publishChatMessageCreated({
    threadId,
    senderId: viewer.userId,
    message,
    members: activeMembers,
    unreadCounts,
  });
  if (!realtime.ok) {
    await enqueueChatJob("chat.deliver", {
      messageId: messageId.toString(),
      threadId,
      senderId: viewer.userId,
      bucket,
    });
  }
  return c.json(message, 201);
});

chatRoutes.patch("/messages/:messageId", messageWriteRateLimit, async function (c) {
  var viewer = authUser(c);
  var messageId = c.req.param("messageId");
  var threadId = c.req.query("threadId");
  if (!threadId) throw badRequest("threadId is required");
  var body = parseJson(editMessageSchema, await c.req.json());
  var bucket = bucketFromMessageId(messageId);
  var row = await fetchMessage(threadId, bucket, messageId);
  if (!row) throw apiError(404, "MESSAGE_NOT_FOUND", "Message not found");
  if (row.sender_id !== viewer.userId) throw forbidden("Only sender can edit this message");
  if (row.is_deleted) throw apiError(410, "MESSAGE_DELETED", "Message deleted");
  await assertActiveMember(threadId, viewer.userId);
  var client = tryGetKeyspacesClient();
  if (!client) throw apiError(503, "KEYSPACES_UNAVAILABLE", "Keyspaces unavailable");
  var now = new Date();
  await client.execute(
    "INSERT INTO message_edits (thread_id, message_id, edit_id, previous_body, edited_at) VALUES (?, ?, ?, ?, ?)",
    [threadId, timeUuidFromString(messageId), cassandra.types.TimeUuid.now(), row.body, now],
    { executionProfile: "chat-write" }
  );
  await client.execute(
    "UPDATE messages SET body = ?, edited_at = ? WHERE thread_id = ? AND bucket = ? AND message_id = ?",
    [body.body, now, threadId, bucket, timeUuidFromString(messageId)],
    { executionProfile: "chat-write" }
  );
  row.body = body.body;
  row.edited_at = now;
  var profileMap = await fetchProfiles([row.sender_id]);
  var message = hydrateMessage(row, profileMap, viewer.userId);
  var published = await publishChatMessageUpdated({
    threadId,
    type: "edit",
    message,
  });
  if (!published) {
    await enqueueChatJob("chat.messageUpdated", { messageId, threadId, bucket, type: "edit" });
  }
  return c.json(message);
});

chatRoutes.delete("/messages/:messageId", messageWriteRateLimit, async function (c) {
  var viewer = authUser(c);
  var messageId = c.req.param("messageId");
  var threadId = c.req.query("threadId");
  if (!threadId) throw badRequest("threadId is required");
  var bucket = bucketFromMessageId(messageId);
  var row = await fetchMessage(threadId, bucket, messageId);
  if (!row) throw apiError(404, "MESSAGE_NOT_FOUND", "Message not found");
  if (row.sender_id !== viewer.userId) throw forbidden("Only sender can delete this message");
  var client = tryGetKeyspacesClient();
  if (!client) throw apiError(503, "KEYSPACES_UNAVAILABLE", "Keyspaces unavailable");
  await client.execute(
    "UPDATE messages SET is_deleted = true, deleted_at = ?, body = null, media_url = null WHERE thread_id = ? AND bucket = ? AND message_id = ?",
    [new Date(), threadId, bucket, timeUuidFromString(messageId)],
    { executionProfile: "chat-write" }
  );
  await enqueueChatJob("chat.messageUpdated", { messageId, threadId, bucket, type: "delete" });
  return c.body(null, 204);
});

chatRoutes.post("/messages/:messageId/reactions", reactionRateLimit, async function (c) {
  var viewer = authUser(c);
  var messageId = c.req.param("messageId");
  var threadId = c.req.query("threadId");
  if (!threadId) throw badRequest("threadId is required");
  var body = parseJson(messageReactionSchema, await c.req.json());
  var bucket = bucketFromMessageId(messageId);
  var row = await fetchMessage(threadId, bucket, messageId);
  if (!row) throw apiError(404, "MESSAGE_NOT_FOUND", "Message not found");
  if (row.is_deleted) throw apiError(410, "MESSAGE_DELETED", "Message deleted");
  await assertActiveMember(threadId, viewer.userId);
  var client = tryGetKeyspacesClient();
  if (!client) throw apiError(503, "KEYSPACES_UNAVAILABLE", "Keyspaces unavailable");
  var userIds = reactionUserSet(row.reactions, body.emoji);
  var alreadyReacted = userIds.has(viewer.userId);
  userIds.add(viewer.userId);
  var nextReactions = setReactionEntry(row.reactions, body.emoji, userIds);
  await client.execute(
    "UPDATE messages SET reactions = ? WHERE thread_id = ? AND bucket = ? AND message_id = ?",
    [nextReactions, threadId, bucket, timeUuidFromString(messageId)],
    { executionProfile: "chat-write" }
  );
  row.reactions = nextReactions;
  var message = hydrateMessage(row, await fetchProfiles([row.sender_id]), viewer.userId);
  var published = await publishChatMessageUpdated({
    threadId,
    type: "reaction",
    message,
  });
  if (!alreadyReacted) {
    var reactionUnread = await publishChatReactionUnread({
      threadId,
      actorId: viewer.userId,
      recipientId: row.sender_id,
      emoji: body.emoji,
    });
    await createChatReactionNotification({
      threadId,
      messageId,
      actorId: viewer.userId,
      recipientId: row.sender_id,
    });
    if (!published || reactionUnread?.inboxPublished === false) {
      await enqueueChatJob("chat.messageUpdated", {
        messageId,
        threadId,
        bucket,
        type: "reaction",
        reactionRecipientId: reactionUnread ? row.sender_id : undefined,
        reactionActorId: reactionUnread ? viewer.userId : undefined,
        reactionPreview: reactionUnread?.preview,
        reactionAt: reactionUnread?.reactedAt,
      });
    }
  } else if (!published) {
    await enqueueChatJob("chat.messageUpdated", { messageId, threadId, bucket, type: "reaction" });
  }
  return c.json(message);
});

chatRoutes.delete("/messages/:messageId/reactions/:emoji", reactionRateLimit, async function (c) {
  var viewer = authUser(c);
  var messageId = c.req.param("messageId");
  var threadId = c.req.query("threadId");
  if (!threadId) throw badRequest("threadId is required");
  var emoji = decodeURIComponent(c.req.param("emoji"));
  var bucket = bucketFromMessageId(messageId);
  var row = await fetchMessage(threadId, bucket, messageId);
  if (!row) throw apiError(404, "MESSAGE_NOT_FOUND", "Message not found");
  await assertActiveMember(threadId, viewer.userId);
  var client = tryGetKeyspacesClient();
  if (!client) throw apiError(503, "KEYSPACES_UNAVAILABLE", "Keyspaces unavailable");
  var userIds = reactionUserSet(row.reactions, emoji);
  userIds.delete(viewer.userId);
  var nextReactions = setReactionEntry(row.reactions, emoji, userIds);
  await client.execute(
    "UPDATE messages SET reactions = ? WHERE thread_id = ? AND bucket = ? AND message_id = ?",
    [nextReactions, threadId, bucket, timeUuidFromString(messageId)],
    { executionProfile: "chat-write" }
  );
  row.reactions = nextReactions;
  var message = hydrateMessage(row, await fetchProfiles([row.sender_id]), viewer.userId);
  var published = await publishChatMessageUpdated({
    threadId,
    type: "reaction",
    message,
  });
  if (!published) {
    await enqueueChatJob("chat.messageUpdated", { messageId, threadId, bucket, type: "reaction" });
  }
  return c.json(message);
});

chatRoutes.patch("/threads/:threadId/read", readStateRateLimit, async function (c) {
  var viewer = authUser(c);
  var threadId = c.req.param("threadId");
  var body = parseJson({ parse: (v: unknown) => {
    if (!v || typeof v !== "object" || typeof (v as { lastReadMessageId?: unknown }).lastReadMessageId !== "string") {
      throw badRequest("lastReadMessageId is required");
    }
    return v as { lastReadMessageId: string };
  } }, await c.req.json());
  await assertActiveMember(threadId, viewer.userId);
  await getDb()
    .insert(chatMemberState)
    .values({ threadId, userId: viewer.userId, lastReadMessageId: body.lastReadMessageId })
    .onConflictDoUpdate({
      target: [chatMemberState.threadId, chatMemberState.userId],
      set: { lastReadMessageId: body.lastReadMessageId },
    });
  await resetUnread(viewer.userId, threadId);
  var published = await publishChatReadReceipt({
    threadId,
    user: viewer,
    lastReadMessageId: body.lastReadMessageId,
  });
  if (!published) {
    await enqueueChatJob("chat.readReceipt", {
      threadId,
      userId: viewer.userId,
      lastReadMessageId: body.lastReadMessageId,
    });
  }
  return c.body(null, 204);
});

chatRoutes.get("/threads/:threadId/read-receipts", async function (c) {
  var viewer = authUser(c);
  var threadId = c.req.param("threadId");
  await assertActiveMember(threadId, viewer.userId);
  var rows = await getDb()
    .select({
      userId: chatMemberState.userId,
      username: profiles.username,
      lastReadMessageId: chatMemberState.lastReadMessageId,
    })
    .from(chatParticipants)
    .innerJoin(
      chatMemberState,
      and(
        eq(chatMemberState.threadId, chatParticipants.threadId),
        eq(chatMemberState.userId, chatParticipants.userId)
      )
    )
    .innerJoin(profiles, eq(profiles.userId, chatParticipants.userId))
    .where(
      and(
        eq(chatParticipants.threadId, threadId),
        ne(chatParticipants.userId, viewer.userId),
        isNull(chatParticipants.leftAt),
        isNotNull(chatMemberState.lastReadMessageId)
      )
    );
  var response: ChatReadReceiptsResponse = {
    items: rows.map(function (row) {
      return {
        userId: row.userId,
        username: row.username,
        lastReadMessageId: row.lastReadMessageId as string,
      };
    }),
  };
  return c.json(response);
});

async function updateMemberStateDate(
  threadId: string,
  userId: string,
  field: "archivedAt" | "mutedUntil" | "deletedAt",
  value: Date | null
) {
  await assertActiveMember(threadId, userId);
  await getDb()
    .insert(chatMemberState)
    .values({ threadId, userId, [field]: value })
    .onConflictDoUpdate({
      target: [chatMemberState.threadId, chatMemberState.userId],
      set: { [field]: value },
    });
}

chatRoutes.patch("/threads/:threadId/archive", threadStateRateLimit, async function (c) {
  var viewer = authUser(c);
  var body = await c.req.json() as { archived?: unknown };
  await updateMemberStateDate(
    c.req.param("threadId"),
    viewer.userId,
    "archivedAt",
    body.archived === true ? new Date() : null
  );
  return c.body(null, 204);
});

chatRoutes.patch("/threads/:threadId/mute", threadStateRateLimit, async function (c) {
  var viewer = authUser(c);
  var body = await c.req.json() as { mutedUntil?: unknown };
  var mutedUntil = typeof body.mutedUntil === "string" ? new Date(body.mutedUntil) : null;
  if (mutedUntil && Number.isNaN(mutedUntil.getTime())) throw badRequest("Invalid mutedUntil");
  await updateMemberStateDate(c.req.param("threadId"), viewer.userId, "mutedUntil", mutedUntil);
  return c.body(null, 204);
});

chatRoutes.delete("/threads/:threadId", threadStateRateLimit, async function (c) {
  var viewer = authUser(c);
  await updateMemberStateDate(c.req.param("threadId"), viewer.userId, "deletedAt", new Date());
  return c.body(null, 204);
});

chatRoutes.post("/threads/:threadId/typing", typingRateLimit, async function (c) {
  var viewer = authUser(c);
  var threadId = c.req.param("threadId");
  var body = parseJson(typingIndicatorSchema, await c.req.json());
  await assertActiveMember(threadId, viewer.userId);
  if (body.isTyping) await setTyping(threadId, viewer.userId);
  else await clearTyping(threadId, viewer.userId);
  var published = await publishChatTyping({
    threadId,
    user: viewer,
    isTyping: body.isTyping,
  });
  if (!published) {
    await enqueueChatJob("chat.typing", { threadId, userId: viewer.userId, isTyping: body.isTyping });
  }
  return c.body(null, 204);
});

chatRoutes.get("/threads/:threadId/typing", async function (c) {
  var viewer = authUser(c);
  var threadId = c.req.param("threadId");
  await assertActiveMember(threadId, viewer.userId);
  var typingUserIds = (await getTypingUsers(threadId)).filter(function (userId) {
    return userId !== viewer.userId;
  });
  var profileMap = await fetchProfiles(typingUserIds);
  var response: ChatTypingSnapshot = {
    typingUserIds,
    items: typingUserIds.map(function (userId) {
      var profile = profileMap.get(userId);
      return {
        userId,
        username: profile?.username ?? "unknown",
        avatarUrl: profile?.avatarUrl ?? null,
      };
    }),
  };
  return c.json(response);
});

chatRoutes.post("/presence/ping", presenceRateLimit, async function (c) {
  var viewer = authUser(c);
  await setPresence(viewer.userId);
  return c.body(null, 204);
});

chatRoutes.post("/presence/batch", presenceBatchRateLimit, async function (c) {
  var body = parseJson(chatPresenceBatchSchema, await c.req.json());
  var userIds = Array.from(new Set(body.userIds));
  var users = await getPresenceStates(userIds);
  var visibility = await getActivityVisibilityCache(userIds);
  var missingVisibilityIds = userIds.filter(function (userId) {
    return visibility[userId] === null;
  });
  var settingsRows = missingVisibilityIds.length > 0
    ? await getDb()
        .select({
          userId: userSettings.userId,
          showActivityStatus: userSettings.showActivityStatus,
        })
        .from(userSettings)
        .where(inArray(userSettings.userId, missingVisibilityIds))
    : [];
  settingsRows.forEach(function (row) {
    visibility[row.userId] = row.showActivityStatus;
  });
  await Promise.all(
    missingVisibilityIds.map(function (userId) {
      var visible = visibility[userId] ?? true;
      visibility[userId] = visible;
      return setActivityVisibilityCache(userId, visible);
    })
  );
  var hiddenUserIds = new Set(
    userIds.filter(function (userId) {
      return visibility[userId] === false;
    })
  );
  hiddenUserIds.forEach(function (userId) {
    users[userId] = {
      userId,
      status: "offline",
      lastSeenAt: null,
    };
  });
  var presence: Record<string, boolean> = {};
  Object.keys(users).forEach(function (userId) {
    presence[userId] = users[userId].status === "online";
  });
  var response: ChatPresenceBatchResponse = { presence, users };
  return c.json(response);
});
