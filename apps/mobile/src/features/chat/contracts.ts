import type {
  ChatInboxPage,
  ChatMember,
  ChatMessage,
  ChatMessagesPage,
  ChatPresenceBatchResponse,
  ChatPresenceState,
  ChatReadReceiptsResponse,
  ChatThreadPreview,
  ChatTypingSnapshot,
  ChatTypingUser,
  MessageReaction,
  MessageReplySnapshot,
} from "@35mm/types";

export interface ChatContactCandidate {
  readonly id: string;
  readonly username: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly avatarUrlLg: string | null;
  readonly isPrivate: boolean;
  readonly followState: string | null;
  readonly isFollowing: boolean;
}

export interface ChatContactSearchResponse {
  readonly users: ChatContactCandidate[];
}

export interface MediaPresignResponse {
  readonly uploadUrl: string;
  readonly publicUrl: string;
  readonly objectKey: string;
  readonly contentType: string;
  readonly cacheControl: string;
  readonly expiresInSeconds: number;
  readonly variants: Record<string, string>;
}

const THREAD_TYPES = new Set(["dm", "group"]);
const MESSAGE_TYPES = new Set(["text", "image", "gif", "file", "link"]);
const MEMBER_ROLES = new Set(["member", "admin"]);
const PRESENCE_STATUSES = new Set(["online", "offline"]);

function record(value: unknown, contract: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${contract} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, key: string, contract: string): string {
  const field = value[key];
  if (typeof field !== "string" || field.trim().length === 0) {
    throw new Error(`${contract}.${key} must be a non-empty string.`);
  }
  return field;
}

function optionalStringField(value: Record<string, unknown>, key: string, contract: string): string | undefined {
  if (!(key in value)) return undefined;
  return stringField(value, key, contract);
}

function nullableStringField(value: Record<string, unknown>, key: string, contract: string): string | null {
  const field = value[key];
  if (field === null) return null;
  if (typeof field !== "string") {
    throw new Error(`${contract}.${key} must be a string or null.`);
  }
  return field;
}

function optionalNullableStringField(
  value: Record<string, unknown>,
  key: string,
  contract: string,
): string | null | undefined {
  if (!(key in value)) return undefined;
  return nullableStringField(value, key, contract);
}

function booleanField(value: Record<string, unknown>, key: string, contract: string): boolean {
  const field = value[key];
  if (typeof field !== "boolean") {
    throw new Error(`${contract}.${key} must be a boolean.`);
  }
  return field;
}

function countField(value: Record<string, unknown>, key: string, contract: string): number {
  const field = value[key];
  if (typeof field !== "number" || !Number.isSafeInteger(field) || field < 0) {
    throw new Error(`${contract}.${key} must be a non-negative integer.`);
  }
  return field;
}

function optionalPositiveCountField(value: Record<string, unknown>, key: string, contract: string): number | undefined {
  if (!(key in value)) return undefined;
  const field = value[key];
  if (typeof field !== "number" || !Number.isSafeInteger(field) || field <= 0) {
    throw new Error(`${contract}.${key} must be a positive integer.`);
  }
  return field;
}

function isoDateField(value: Record<string, unknown>, key: string, contract: string): string {
  const field = stringField(value, key, contract);
  if (!Number.isFinite(Date.parse(field))) {
    throw new Error(`${contract}.${key} must be an ISO date.`);
  }
  return field;
}

function nullableIsoDateField(value: Record<string, unknown>, key: string, contract: string): string | null {
  const field = nullableStringField(value, key, contract);
  if (field !== null && !Number.isFinite(Date.parse(field))) {
    throw new Error(`${contract}.${key} must be an ISO date or null.`);
  }
  return field;
}

function optionalStringRecord(value: Record<string, unknown>, key: string, contract: string): Record<string, string> | null {
  const field = value[key];
  if (field === null) return null;
  if (field === undefined) return null;
  const source = record(field, `${contract}.${key}`);
  const output: Record<string, string> = {};
  for (const [entryKey, entryValue] of Object.entries(source)) {
    if (typeof entryValue === "string") output[entryKey] = entryValue;
  }
  return output;
}

function parseMember(value: unknown): ChatMember {
  const member = record(value, "ChatMember");
  const role = stringField(member, "role", "ChatMember");
  if (!MEMBER_ROLES.has(role)) throw new Error("ChatMember.role is invalid.");
  return {
    userId: stringField(member, "userId", "ChatMember"),
    username: stringField(member, "username", "ChatMember"),
    displayName: stringField(member, "displayName", "ChatMember"),
    avatarUrl: nullableStringField(member, "avatarUrl", "ChatMember"),
    avatarVariants: optionalStringRecord(member, "avatarVariants", "ChatMember"),
    role: role as ChatMember["role"],
    joinedAt: isoDateField(member, "joinedAt", "ChatMember"),
  };
}

function parseReplySnapshot(value: unknown): MessageReplySnapshot | null {
  if (value === null) return null;
  const snapshot = record(value, "MessageReplySnapshot");
  const contentType = stringField(snapshot, "contentType", "MessageReplySnapshot");
  if (!MESSAGE_TYPES.has(contentType)) throw new Error("MessageReplySnapshot.contentType is invalid.");
  return {
    senderId: stringField(snapshot, "senderId", "MessageReplySnapshot"),
    senderUsername: stringField(snapshot, "senderUsername", "MessageReplySnapshot"),
    body: nullableStringField(snapshot, "body", "MessageReplySnapshot"),
    contentType: contentType as MessageReplySnapshot["contentType"],
  };
}

function parseReaction(value: unknown): MessageReaction {
  const reaction = record(value, "MessageReaction");
  const userIds = reaction.userIds;
  if (!Array.isArray(userIds) || userIds.some((item) => typeof item !== "string")) {
    throw new Error("MessageReaction.userIds must be a string array.");
  }
  return {
    emoji: stringField(reaction, "emoji", "MessageReaction"),
    count: countField(reaction, "count", "MessageReaction"),
    userIds,
    viewerReacted: booleanField(reaction, "viewerReacted", "MessageReaction"),
  };
}

function parseMessageMediaMetadata(value: unknown): ChatMessage["mediaMetadata"] {
  if (value === null) return null;
  const metadata = record(value, "ChatMessage.mediaMetadata");
  const width = optionalPositiveCountField(metadata, "width", "ChatMessage.mediaMetadata");
  const height = optionalPositiveCountField(metadata, "height", "ChatMessage.mediaMetadata");
  const size = optionalPositiveCountField(metadata, "size", "ChatMessage.mediaMetadata");
  const mimeType = optionalStringField(metadata, "mimeType", "ChatMessage.mediaMetadata");
  const blurhash = optionalStringField(metadata, "blurhash", "ChatMessage.mediaMetadata");
  return {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(size !== undefined ? { size } : {}),
    ...(mimeType !== undefined ? { mimeType } : {}),
    ...(blurhash !== undefined ? { blurhash } : {}),
  };
}

function parseLinkPreview(value: unknown): ChatMessage["linkPreview"] {
  if (value === null) return null;
  const preview = record(value, "ChatMessage.linkPreview");
  const title = optionalStringField(preview, "title", "ChatMessage.linkPreview");
  const description = optionalStringField(preview, "description", "ChatMessage.linkPreview");
  const imageUrl = optionalStringField(preview, "imageUrl", "ChatMessage.linkPreview");
  const siteName = optionalStringField(preview, "siteName", "ChatMessage.linkPreview");
  return {
    url: stringField(preview, "url", "ChatMessage.linkPreview"),
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    ...(siteName !== undefined ? { siteName } : {}),
  };
}

export function parseChatMessage(value: unknown): ChatMessage {
  const message = record(value, "ChatMessage");
  const contentType = stringField(message, "contentType", "ChatMessage");
  if (!MESSAGE_TYPES.has(contentType)) throw new Error("ChatMessage.contentType is invalid.");
  const reactions = message.reactions;
  if (!Array.isArray(reactions)) throw new Error("ChatMessage.reactions must be an array.");
  return {
    id: stringField(message, "id", "ChatMessage"),
    threadId: stringField(message, "threadId", "ChatMessage"),
    bucket: countField(message, "bucket", "ChatMessage"),
    senderId: stringField(message, "senderId", "ChatMessage"),
    senderUsername: stringField(message, "senderUsername", "ChatMessage"),
    senderDisplayName: stringField(message, "senderDisplayName", "ChatMessage"),
    senderAvatarUrl: nullableStringField(message, "senderAvatarUrl", "ChatMessage"),
    senderAvatarVariants: optionalStringRecord(message, "senderAvatarVariants", "ChatMessage"),
    contentType: contentType as ChatMessage["contentType"],
    body: nullableStringField(message, "body", "ChatMessage"),
    mediaUrl: nullableStringField(message, "mediaUrl", "ChatMessage"),
    mediaMetadata: parseMessageMediaMetadata(message.mediaMetadata ?? null),
    linkPreview: parseLinkPreview(message.linkPreview ?? null),
    replyToId: nullableStringField(message, "replyToId", "ChatMessage"),
    replySnapshot: parseReplySnapshot(message.replySnapshot ?? null),
    reactions: reactions.map(parseReaction),
    isDeleted: booleanField(message, "isDeleted", "ChatMessage"),
    editedAt: nullableIsoDateField(message, "editedAt", "ChatMessage"),
    createdAt: isoDateField(message, "createdAt", "ChatMessage"),
  };
}

export function parseChatThreadPreview(value: unknown): ChatThreadPreview {
  const thread = record(value, "ChatThreadPreview");
  const type = stringField(thread, "type", "ChatThreadPreview");
  if (!THREAD_TYPES.has(type)) throw new Error("ChatThreadPreview.type is invalid.");
  const members = thread.members;
  if (!Array.isArray(members)) throw new Error("ChatThreadPreview.members must be an array.");
  return {
    id: stringField(thread, "id", "ChatThreadPreview"),
    type: type as ChatThreadPreview["type"],
    members: members.map(parseMember),
    lastMessageAt: nullableIsoDateField(thread, "lastMessageAt", "ChatThreadPreview"),
    lastMessagePreview: nullableStringField(thread, "lastMessagePreview", "ChatThreadPreview"),
    lastSenderId: nullableStringField(thread, "lastSenderId", "ChatThreadPreview"),
    unreadCount: countField(thread, "unreadCount", "ChatThreadPreview"),
    isArchived: booleanField(thread, "isArchived", "ChatThreadPreview"),
    isMuted: booleanField(thread, "isMuted", "ChatThreadPreview"),
    deletedAt: nullableIsoDateField(thread, "deletedAt", "ChatThreadPreview"),
  };
}

export function parseChatInboxPage(value: unknown): ChatInboxPage {
  const page = record(value, "ChatInboxPage");
  if (!Array.isArray(page.items)) throw new Error("ChatInboxPage.items must be an array.");
  return {
    items: page.items.map(parseChatThreadPreview),
    nextCursor: nullableStringField(page, "nextCursor", "ChatInboxPage"),
    hasMore: booleanField(page, "hasMore", "ChatInboxPage"),
  };
}

export function parseChatMessagesPage(value: unknown): ChatMessagesPage {
  const page = record(value, "ChatMessagesPage");
  if (!Array.isArray(page.items)) throw new Error("ChatMessagesPage.items must be an array.");
  return {
    items: page.items.map(parseChatMessage),
    nextCursor: nullableStringField(page, "nextCursor", "ChatMessagesPage"),
    hasMore: booleanField(page, "hasMore", "ChatMessagesPage"),
  };
}

function parseTypingUser(value: unknown): ChatTypingUser {
  const user = record(value, "ChatTypingUser");
  return {
    userId: stringField(user, "userId", "ChatTypingUser"),
    username: stringField(user, "username", "ChatTypingUser"),
    avatarUrl: nullableStringField(user, "avatarUrl", "ChatTypingUser"),
  };
}

export function parseChatTypingSnapshot(value: unknown): ChatTypingSnapshot {
  const snapshot = record(value, "ChatTypingSnapshot");
  const typingUserIds = snapshot.typingUserIds;
  const items = snapshot.items;
  if (!Array.isArray(typingUserIds) || typingUserIds.some((item) => typeof item !== "string")) {
    throw new Error("ChatTypingSnapshot.typingUserIds must be a string array.");
  }
  if (!Array.isArray(items)) throw new Error("ChatTypingSnapshot.items must be an array.");
  return { typingUserIds, items: items.map(parseTypingUser) };
}

export function parseChatReadReceipts(value: unknown): ChatReadReceiptsResponse {
  const response = record(value, "ChatReadReceiptsResponse");
  const items = response.items;
  if (!Array.isArray(items)) throw new Error("ChatReadReceiptsResponse.items must be an array.");
  return {
    items: items.map((item) => {
      const receipt = record(item, "ChatReadReceipt");
      return {
        userId: stringField(receipt, "userId", "ChatReadReceipt"),
        username: stringField(receipt, "username", "ChatReadReceipt"),
        lastReadMessageId: stringField(receipt, "lastReadMessageId", "ChatReadReceipt"),
      };
    }),
  };
}

function parsePresenceState(value: unknown): ChatPresenceState {
  const state = record(value, "ChatPresenceState");
  const status = stringField(state, "status", "ChatPresenceState");
  if (!PRESENCE_STATUSES.has(status)) throw new Error("ChatPresenceState.status is invalid.");
  return {
    userId: stringField(state, "userId", "ChatPresenceState"),
    status: status as ChatPresenceState["status"],
    lastSeenAt: nullableIsoDateField(state, "lastSeenAt", "ChatPresenceState"),
  };
}

export function parseChatPresenceBatch(value: unknown): ChatPresenceBatchResponse {
  const response = record(value, "ChatPresenceBatchResponse");
  const presence = record(response.presence, "ChatPresenceBatchResponse.presence");
  const users = record(response.users, "ChatPresenceBatchResponse.users");
  const parsedPresence: Record<string, boolean> = {};
  for (const [key, present] of Object.entries(presence)) {
    if (typeof present !== "boolean") throw new Error("ChatPresenceBatchResponse.presence values must be boolean.");
    parsedPresence[key] = present;
  }
  const parsedUsers: Record<string, ChatPresenceState> = {};
  for (const [key, state] of Object.entries(users)) parsedUsers[key] = parsePresenceState(state);
  return { presence: parsedPresence, users: parsedUsers };
}

export function parseContactSearchResponse(value: unknown): ChatContactSearchResponse {
  const response = record(value, "ChatContactSearchResponse");
  if (!Array.isArray(response.users)) throw new Error("ChatContactSearchResponse.users must be an array.");
  return {
    users: response.users.map((candidate) => {
      const user = record(candidate, "ChatContactCandidate");
      return {
        id: stringField(user, "id", "ChatContactCandidate"),
        username: stringField(user, "username", "ChatContactCandidate"),
        displayName: nullableStringField(user, "displayName", "ChatContactCandidate"),
        avatarUrl: nullableStringField(user, "avatarUrl", "ChatContactCandidate"),
        avatarUrlLg: nullableStringField(user, "avatarUrlLg", "ChatContactCandidate"),
        isPrivate: booleanField(user, "isPrivate", "ChatContactCandidate"),
        followState: optionalNullableStringField(user, "followState", "ChatContactCandidate") ?? null,
        isFollowing: booleanField(user, "isFollowing", "ChatContactCandidate"),
      };
    }),
  };
}

export function parseMediaPresignResponse(value: unknown): MediaPresignResponse {
  const response = record(value, "MediaPresignResponse");
  return {
    uploadUrl: stringField(response, "uploadUrl", "MediaPresignResponse"),
    publicUrl: stringField(response, "publicUrl", "MediaPresignResponse"),
    objectKey: stringField(response, "objectKey", "MediaPresignResponse"),
    contentType: stringField(response, "contentType", "MediaPresignResponse"),
    cacheControl: stringField(response, "cacheControl", "MediaPresignResponse"),
    expiresInSeconds: countField(response, "expiresInSeconds", "MediaPresignResponse"),
    variants: optionalStringRecord(response, "variants", "MediaPresignResponse") ?? {},
  };
}
