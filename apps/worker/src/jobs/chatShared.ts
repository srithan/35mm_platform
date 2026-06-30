import cassandra from "cassandra-driver";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { createDb, chatParticipants, profiles } from "@35mm/db";
import type { ChatMessage, ChatMessageContentType, ChatMember, MessageReaction, MessageReplySnapshot } from "@35mm/types";
import { loadWorkerEnv } from "../lib/env.js";
import { tryGetKeyspacesClient } from "../lib/keyspaces.js";

type DbClient = ReturnType<typeof createDb>;

export type ChatKeyspacesRow = {
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
  edited_at: Date | null;
  created_at: Date | null;
};

export type ChatProfile = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarVariants: Record<string, string> | null;
};

let db = null as DbClient | null;

export function getWorkerDb(): DbClient {
  if (db) return db;
  db = createDb(loadWorkerEnv().DATABASE_URL);
  return db;
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

function rowFromKeyspaces(input: unknown): ChatKeyspacesRow {
  var row = input as { get?: (name: string) => unknown } & Record<string, unknown>;
  function value(name: string): unknown {
    return typeof row.get === "function" ? row.get(name) : row[name];
  }
  return {
    thread_id: String(value("thread_id")),
    bucket: Number(value("bucket")),
    message_id: value("message_id") as ChatKeyspacesRow["message_id"],
    sender_id: String(value("sender_id")),
    content_type: String(value("content_type")) as ChatMessageContentType,
    body: (value("body") as string | null) ?? null,
    media_url: (value("media_url") as string | null) ?? null,
    media_meta: (value("media_meta") as string | null) ?? null,
    link_preview: (value("link_preview") as string | null) ?? null,
    reply_to_id: (value("reply_to_id") as ChatKeyspacesRow["reply_to_id"]) ?? null,
    reply_snapshot: (value("reply_snapshot") as string | null) ?? null,
    reactions: value("reactions"),
    is_deleted: (value("is_deleted") as boolean | null) ?? false,
    edited_at: (value("edited_at") as Date | null) ?? null,
    created_at: (value("created_at") as Date | null) ?? null,
  };
}

export async function fetchChatMessageFromKeyspaces(input: {
  threadId: string;
  bucket: number;
  messageId: string;
}): Promise<ChatKeyspacesRow | null> {
  var client = tryGetKeyspacesClient();
  if (!client) return null;
  var result = await client.execute(
    "SELECT * FROM messages WHERE thread_id = ? AND bucket = ? AND message_id = ?",
    [
      input.threadId,
      input.bucket,
      cassandra.types.TimeUuid.fromString(input.messageId),
    ],
    { executionProfile: "chat-read" }
  );
  if (result.rows.length === 0) return null;
  return rowFromKeyspaces(result.rows[0]);
}

export async function fetchProfiles(userIds: string[]): Promise<Map<string, ChatProfile>> {
  var unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return new Map();
  var rows = await getWorkerDb()
    .select({
      userId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
    })
    .from(profiles)
    .where(inArray(profiles.userId, unique));
  var map = new Map<string, ChatProfile>();
  for (var row of rows) {
    map.set(row.userId, {
      ...row,
      avatarVariants: asRecord(row.avatarVariants),
    });
  }
  return map;
}

export async function fetchActiveMembers(threadId: string): Promise<ChatMember[]> {
  var rows = await getWorkerDb()
    .select({
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
    .where(and(eq(chatParticipants.threadId, threadId), isNull(chatParticipants.leftAt)));
  return rows.map(function (row) {
    return {
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      avatarVariants: asRecord(row.avatarVariants),
      role: row.role === "admin" ? "admin" : "member",
      joinedAt: row.joinedAt.toISOString(),
    };
  });
}

export function hydrateChatMessage(
  row: ChatKeyspacesRow,
  profileMap: Map<string, ChatProfile>,
  viewerId: string
): ChatMessage {
  var profile = profileMap.get(row.sender_id);
  var isDeleted = Boolean(row.is_deleted);
  var createdAt = row.created_at ?? row.message_id.getDate?.() ?? new Date();
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
    mediaMetadata: isDeleted ? null : parseJsonObject<ChatMessage["mediaMetadata"]>(row.media_meta),
    linkPreview: isDeleted ? null : parseJsonObject<ChatMessage["linkPreview"]>(row.link_preview),
    replyToId: row.reply_to_id?.toString() ?? null,
    replySnapshot: parseJsonObject<MessageReplySnapshot>(row.reply_snapshot),
    reactions: hydrateReactions(row.reactions, viewerId),
    isDeleted,
    editedAt: row.edited_at?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
  };
}
