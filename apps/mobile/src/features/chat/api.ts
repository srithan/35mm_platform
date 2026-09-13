import type { ApiClient } from "@35mm/api-client";
import type {
  ChatInboxPage,
  ChatMessage,
  ChatMessagesPage,
  ChatPresenceBatchResponse,
  ChatReadReceiptsResponse,
  ChatThreadPreview,
  ChatTypingSnapshot,
} from "@35mm/types";

import {
  parseChatInboxPage,
  parseChatMessage,
  parseChatMessagesPage,
  parseChatPresenceBatch,
  parseChatReadReceipts,
  parseChatThreadPreview,
  parseChatTypingSnapshot,
  parseContactSearchResponse,
  parseMediaPresignResponse,
  type ChatContactSearchResponse,
  type MediaPresignResponse,
} from "./contracts";

export function fetchChatInbox(
  client: ApiClient,
  input: {
    readonly cursor: string | null;
    readonly signal?: AbortSignal;
  },
): Promise<ChatInboxPage> {
  const query = new URLSearchParams({ limit: "20" });
  if (input.cursor) query.set("cursor", input.cursor);
  return client.request(`/v1/chat/inbox?${query.toString()}`, {
    auth: "required",
    operation: "chat.inbox",
    parser: parseChatInboxPage,
    ...(input.signal ? { signal: input.signal } : {}),
  });
}

export function createChatThread(
  client: ApiClient,
  memberId: string,
): Promise<ChatThreadPreview> {
  return client.request("/v1/chat/threads", {
    auth: "required",
    body: { type: "dm", memberIds: [memberId] },
    method: "POST",
    operation: "chat.thread.create",
    parser: parseChatThreadPreview,
    requestClass: "mutation",
  });
}

export function fetchChatMessages(
  client: ApiClient,
  input: {
    readonly threadId: string;
    readonly before: string | null;
    readonly signal?: AbortSignal;
  },
): Promise<ChatMessagesPage> {
  const query = new URLSearchParams({ limit: "50" });
  if (input.before) query.set("before", input.before);
  return client.request(`/v1/chat/threads/${encodeURIComponent(input.threadId)}/messages?${query.toString()}`, {
    auth: "required",
    operation: "chat.messages",
    parser: parseChatMessagesPage,
    ...(input.signal ? { signal: input.signal } : {}),
  });
}

export function sendChatMessage(
  client: ApiClient,
  input: {
    readonly threadId: string;
    readonly body: string | null;
    readonly contentType: "text" | "image" | "gif" | "file" | "link";
    readonly mediaUrl?: string;
    readonly mediaMetadata?: {
      readonly width?: number;
      readonly height?: number;
      readonly size?: number;
      readonly mimeType?: string;
      readonly blurhash?: string;
    };
    readonly replyToId?: string;
  },
): Promise<ChatMessage> {
  return client.request(`/v1/chat/threads/${encodeURIComponent(input.threadId)}/messages`, {
    auth: "required",
    body: {
      contentType: input.contentType,
      ...(input.body ? { body: input.body } : {}),
      ...(input.mediaUrl ? { mediaUrl: input.mediaUrl } : {}),
      ...(input.mediaMetadata ? { mediaMetadata: input.mediaMetadata } : {}),
      ...(input.replyToId ? { replyToId: input.replyToId } : {}),
    },
    method: "POST",
    operation: "chat.message.send",
    parser: parseChatMessage,
    requestClass: "mutation",
  });
}

export function editChatMessage(
  client: ApiClient,
  threadId: string,
  messageId: string,
  body: string,
): Promise<ChatMessage> {
  const query = new URLSearchParams({ threadId });
  return client.request(`/v1/chat/messages/${encodeURIComponent(messageId)}?${query.toString()}`, {
    auth: "required",
    body: { body },
    method: "PATCH",
    operation: "chat.message.edit",
    parser: parseChatMessage,
    requestClass: "mutation",
  });
}

export function deleteChatMessage(
  client: ApiClient,
  threadId: string,
  messageId: string,
): Promise<void> {
  const query = new URLSearchParams({ threadId });
  return client.request(`/v1/chat/messages/${encodeURIComponent(messageId)}?${query.toString()}`, {
    auth: "required",
    method: "DELETE",
    operation: "chat.message.delete",
    requestClass: "mutation",
  });
}

export function setChatReaction(
  client: ApiClient,
  input: {
    readonly threadId: string;
    readonly messageId: string;
    readonly emoji: string;
    readonly selected: boolean;
  },
): Promise<ChatMessage> {
  const query = new URLSearchParams({ threadId: input.threadId });
  const suffix = input.selected ? "reactions" : `reactions/${encodeURIComponent(input.emoji)}`;
  return client.request(`/v1/chat/messages/${encodeURIComponent(input.messageId)}/${suffix}?${query.toString()}`, {
    auth: "required",
    body: input.selected ? { emoji: input.emoji } : undefined,
    method: input.selected ? "POST" : "DELETE",
    operation: input.selected ? "chat.reaction.add" : "chat.reaction.remove",
    parser: parseChatMessage,
    requestClass: "mutation",
  });
}

export function markChatThreadRead(
  client: ApiClient,
  threadId: string,
  lastReadMessageId: string,
): Promise<void> {
  return client.request(`/v1/chat/threads/${encodeURIComponent(threadId)}/read`, {
    auth: "required",
    body: { lastReadMessageId },
    method: "PATCH",
    operation: "chat.thread.read",
    requestClass: "mutation",
  });
}

export function setChatThreadArchived(
  client: ApiClient,
  threadId: string,
  archived: boolean,
): Promise<void> {
  return client.request(`/v1/chat/threads/${encodeURIComponent(threadId)}/archive`, {
    auth: "required",
    body: { archived },
    method: "PATCH",
    operation: archived ? "chat.thread.archive" : "chat.thread.unarchive",
    requestClass: "mutation",
  });
}

export function setChatThreadMuted(
  client: ApiClient,
  threadId: string,
  mutedUntil: string | null,
): Promise<void> {
  return client.request(`/v1/chat/threads/${encodeURIComponent(threadId)}/mute`, {
    auth: "required",
    body: { mutedUntil },
    method: "PATCH",
    operation: mutedUntil ? "chat.thread.mute" : "chat.thread.unmute",
    requestClass: "mutation",
  });
}

export function deleteChatThread(client: ApiClient, threadId: string): Promise<void> {
  return client.request(`/v1/chat/threads/${encodeURIComponent(threadId)}`, {
    auth: "required",
    method: "DELETE",
    operation: "chat.thread.delete",
    requestClass: "mutation",
  });
}

export function setChatTyping(
  client: ApiClient,
  threadId: string,
  isTyping: boolean,
): Promise<void> {
  return client.request(`/v1/chat/threads/${encodeURIComponent(threadId)}/typing`, {
    auth: "required",
    body: { isTyping },
    method: "POST",
    operation: isTyping ? "chat.typing.start" : "chat.typing.stop",
    requestClass: "mutation",
  });
}

export function fetchChatTyping(
  client: ApiClient,
  threadId: string,
  signal?: AbortSignal,
): Promise<ChatTypingSnapshot> {
  return client.request(`/v1/chat/threads/${encodeURIComponent(threadId)}/typing`, {
    auth: "required",
    operation: "chat.typing",
    parser: parseChatTypingSnapshot,
    ...(signal ? { signal } : {}),
  });
}

export function fetchChatReadReceipts(
  client: ApiClient,
  threadId: string,
  signal?: AbortSignal,
): Promise<ChatReadReceiptsResponse> {
  return client.request(`/v1/chat/threads/${encodeURIComponent(threadId)}/read-receipts`, {
    auth: "required",
    operation: "chat.read-receipts",
    parser: parseChatReadReceipts,
    ...(signal ? { signal } : {}),
  });
}

export function pingChatPresence(client: ApiClient): Promise<void> {
  return client.request("/v1/chat/presence/ping", {
    auth: "required",
    method: "POST",
    operation: "chat.presence.ping",
    requestClass: "mutation",
  });
}

export function fetchChatPresence(
  client: ApiClient,
  userIds: readonly string[],
  signal?: AbortSignal,
): Promise<ChatPresenceBatchResponse> {
  return client.request("/v1/chat/presence/batch", {
    auth: "required",
    body: { userIds: Array.from(new Set(userIds)).slice(0, 50) },
    method: "POST",
    operation: "chat.presence.batch",
    parser: parseChatPresenceBatch,
    requestClass: "mutation",
    ...(signal ? { signal } : {}),
  });
}

export function searchChatContacts(
  client: ApiClient,
  query: string,
  signal?: AbortSignal,
): Promise<ChatContactSearchResponse> {
  const params = new URLSearchParams({ q: query.trim(), limit: "8" });
  return client.request(`/v1/profiles/search?${params.toString()}`, {
    auth: "required",
    operation: "chat.contacts.search",
    parser: parseContactSearchResponse,
    ...(signal ? { signal } : {}),
  });
}

export function presignChatMedia(
  client: ApiClient,
  input: {
    readonly contentType: string;
    readonly contentLength: number;
  },
): Promise<MediaPresignResponse> {
  return client.request("/v1/media/presign", {
    auth: "required",
    body: {
      kind: "post_media",
      contentType: input.contentType,
      contentLength: input.contentLength,
    },
    method: "POST",
    operation: "chat.media.presign",
    parser: parseMediaPresignResponse,
    requestClass: "mutation",
  });
}
