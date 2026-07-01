/**
 * HTTP implementation of ChatApiClient.
 *
 * HTTP implementation for the persisted `/v1/chat` backend.
 */

import type {
  ChatInboxPage,
  ChatMessage as ApiChatMessage,
  ChatMessagesPage,
  ChatReadReceiptsResponse,
  ChatThreadPreview,
  ChatTypingSnapshot,
} from "@35mm/types";
import type { ChatMessage, ChatPreview, ChatSendPayload } from "../types";
import { formatRelativeShort } from "../lib/formatChatTime";
import { sortChatMessages } from "../lib/sortChatMessages";
import { chatHttpJson, type GetAccessToken } from "./http";
import type { ChatApiClient } from "./ChatApiClient";
import type {
  CreateThreadParams,
  ListConversationsParams,
  ListMessagesParams,
  PaginatedConversations,
  PaginatedMessages,
  SendMessageResult,
} from "./types";

type GetCurrentUserId = () => string | null;

function encodeQuery(q: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  Object.keys(q).forEach(function (k) {
    const v = q[k];
    if (v !== undefined && v !== null && v !== "") {
      p.set(k, String(v));
    }
  });
  const s = p.toString();
  return s ? "?" + s : "";
}

function colorHash(input: string): number {
  var hash = 0;
  for (var i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function avatarStyle(seed: string): { bg: string; color: string } {
  var palettes = [
    ["#2a1e30", "#d8b4fe"],
    ["#1f2937", "#93c5fd"],
    ["#2b2118", "#f4b56a"],
    ["#172a24", "#6ee7b7"],
    ["#301818", "#f0a3a3"],
    ["#1f2433", "#f9d05c"],
  ];
  var pair = palettes[colorHash(seed) % palettes.length];
  return { bg: pair[0], color: pair[1] };
}

function mapThreadPreview(thread: ChatThreadPreview): ChatPreview {
  var members = thread.members;
  var primary = members[0];
  var fallbackName = thread.type === "group" ? "Group chat" : "Conversation";
  var name =
    thread.type === "group" && members.length > 1
      ? members.map(function (member) {
          return member.displayName || member.username;
        }).join(", ")
      : primary?.displayName || primary?.username || fallbackName;
  var username =
    thread.type === "group"
      ? ""
      : primary?.username || "";
  var avatar = avatarStyle(thread.id + ":" + name);
  return {
    id: thread.id,
    name: name,
    username: username,
    lastMessage: thread.lastMessagePreview || "No messages yet.",
    lastMessageAt: thread.lastMessageAt
      ? formatRelativeShort(new Date(thread.lastMessageAt))
      : "",
    unread: thread.unreadCount,
    avatarUrl: thread.type === "group" ? null : primary?.avatarUrl ?? null,
    avatarBg: avatar.bg,
    avatarColor: avatar.color,
    archived: thread.isArchived,
    isPendingRequest: false,
  };
}

function mapReply(
  msg: ApiChatMessage,
  currentUserId: string | null
): ChatMessage["replyTo"] {
  if (!msg.replyToId || !msg.replySnapshot) {
    return undefined;
  }
  var snippet =
    msg.replySnapshot.body ||
    (msg.replySnapshot.contentType === "gif"
      ? "GIF"
      : msg.replySnapshot.contentType === "image"
        ? "Photo"
        : msg.replySnapshot.contentType === "file"
          ? "File"
          : "Message");
  return {
    id: msg.replyToId,
    snippet: snippet,
    isOwn: currentUserId != null && msg.replySnapshot.senderId === currentUserId,
  };
}

function formatBytes(value: number | undefined): string | undefined {
  if (!value || !Number.isFinite(value)) {
    return undefined;
  }
  if (value < 1024) {
    return String(value) + " B";
  }
  if (value < 1024 * 1024) {
    return (value / 1024).toFixed(value < 10240 ? 1 : 0) + " KB";
  }
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

function fileNameFromMessage(msg: ApiChatMessage): string {
  var mediaType = msg.mediaMetadata?.mimeType;
  if (mediaType) {
    return mediaType.split("/")[1] ? "Attachment." + mediaType.split("/")[1] : "Attachment";
  }
  try {
    var url = msg.mediaUrl ? new URL(msg.mediaUrl) : null;
    var leaf = url?.pathname.split("/").filter(Boolean).pop();
    return leaf ? decodeURIComponent(leaf) : "Attachment";
  } catch (_err) {
    return "Attachment";
  }
}

function mapMessage(msg: ApiChatMessage, currentUserId: string | null): ChatMessage {
  var text = msg.isDeleted ? "Message deleted" : msg.body ?? "";
  var media: ChatMessage["media"];
  var file: ChatMessage["file"];
  if (!msg.isDeleted && msg.mediaUrl) {
    if (msg.contentType === "gif" || msg.contentType === "image") {
      media = {
        type: msg.contentType === "gif" ? "gif" : "image",
        url: msg.mediaUrl,
      };
    } else {
      file = {
        name: fileNameFromMessage(msg),
        sizeLabel: formatBytes(msg.mediaMetadata?.size),
      };
    }
  }
  return {
    id: msg.id,
    chatId: msg.threadId,
    text: text,
    isOwn: currentUserId != null && msg.senderId === currentUserId,
    createdAt: msg.createdAt,
    status: "delivered",
    senderAvatarUrl: msg.senderAvatarUrl,
    editedAt: msg.editedAt,
    replyTo: mapReply(msg, currentUserId),
    reactions: (msg.reactions ?? []).map(function (reaction) {
      return {
        emoji: reaction.emoji,
        count: reaction.count,
        includesMe: reaction.userIds.includes(currentUserId ?? "") || reaction.viewerReacted,
      };
    }),
    media: media,
    file: file,
  };
}

function isApiMessage(value: unknown): value is ApiChatMessage {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { id?: unknown }).id === "string" &&
      typeof (value as { threadId?: unknown }).threadId === "string" &&
      typeof (value as { senderId?: unknown }).senderId === "string" &&
      typeof (value as { createdAt?: unknown }).createdAt === "string"
  );
}

function mapSendPayload(payload: ChatSendPayload): {
  contentType: "text" | "image" | "gif" | "file" | "link";
  body?: string;
  mediaUrl?: string;
  mediaMetadata?: { size?: number; mimeType?: string };
  replyToId?: string;
} {
  if (payload.gifUrl) {
    return {
      contentType: "gif",
      body: payload.text || undefined,
      mediaUrl: payload.gifUrl,
      replyToId: payload.replyToId,
    };
  }
  if (payload.imageDataUrl) {
    return {
      contentType: "image",
      body: payload.text || undefined,
      mediaUrl: payload.imageDataUrl,
      replyToId: payload.replyToId,
    };
  }
  if (payload.file) {
    return {
      contentType: "file",
      body: payload.text || payload.file.name,
      mediaUrl: "data:application/octet-stream," + encodeURIComponent(payload.file.name),
      replyToId: payload.replyToId,
    };
  }
  return {
    contentType: "text",
    body: payload.text,
    replyToId: payload.replyToId,
  };
}

export function createRemoteChatClient(opts: {
  baseUrl: string;
  getAccessToken?: GetAccessToken;
  getCurrentUserId?: GetCurrentUserId;
}): ChatApiClient {
  const baseUrl = opts.baseUrl.replace(/\/$/, "");
  const getAccessToken = opts.getAccessToken;
  const getCurrentUserId = opts.getCurrentUserId ?? function () {
    return null;
  };

  return {
    listConversations: function (params: ListConversationsParams) {
      const qs = encodeQuery({
        limit: params.limit,
        cursor: params.cursor || undefined,
      });
      return chatHttpJson<ChatInboxPage>({
        baseUrl: baseUrl,
        path: "/inbox" + qs,
        getAccessToken: getAccessToken,
      }).then(function (page): PaginatedConversations {
        var items = page.items
          .map(mapThreadPreview)
          .filter(function (item) {
            if (params.folder === "archived") {
              return Boolean(item.archived);
            }
            if (params.folder === "requests") {
              return Boolean(item.isPendingRequest);
            }
            return !item.archived && !item.isPendingRequest;
          });
        return {
          items: items,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        };
      });
    },

    createThread: function (params: CreateThreadParams) {
      return chatHttpJson<ChatThreadPreview>({
        baseUrl: baseUrl,
        path: "/threads",
        method: "POST",
        body: {
          type: params.type,
          memberIds: params.memberIds,
        },
        getAccessToken: getAccessToken,
      }).then(mapThreadPreview);
    },

    listMessages: function (params: ListMessagesParams) {
      const qs = encodeQuery({
        limit: params.limit,
        before: params.cursor || undefined,
      });
      return chatHttpJson<ChatMessagesPage>({
        baseUrl: baseUrl,
        path: "/threads/" + encodeURIComponent(params.chatId) + "/messages" + qs,
        getAccessToken: getAccessToken,
      }).then(function (page): PaginatedMessages {
        var currentUserId = getCurrentUserId();
        return {
          items: sortChatMessages(
            page.items
              .filter(function (item) {
                return !item.isDeleted;
              })
              .map(function (item) {
                return mapMessage(item, currentUserId);
              })
          ),
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        };
      });
    },

    sendMessage: function (chatId, payload, opts2) {
      return chatHttpJson<ApiChatMessage>({
        baseUrl: baseUrl,
        path: "/threads/" + encodeURIComponent(chatId) + "/messages",
        method: "POST",
        body: mapSendPayload(payload),
        getAccessToken: getAccessToken,
        idempotencyKey: opts2?.idempotencyKey,
      }).then(function (message): SendMessageResult {
        return {
          message: mapMessage(message, getCurrentUserId()),
        };
      });
    },

    toggleReaction: function (chatId, messageId, emoji, shouldRemove) {
      return chatHttpJson<ApiChatMessage | null>({
        baseUrl: baseUrl,
        path:
          "/messages/" +
          encodeURIComponent(messageId) +
          "/reactions" +
          (shouldRemove ? "/" + encodeURIComponent(emoji) : "") +
          encodeQuery({ threadId: chatId }),
        method: shouldRemove ? "DELETE" : "POST",
        body: shouldRemove ? undefined : { emoji: emoji },
        getAccessToken: getAccessToken,
      }).then(function (message) {
        if (!isApiMessage(message)) {
          return null;
        }
        return mapMessage(message, getCurrentUserId());
      });
    },

    editMessage: function (chatId, messageId, body) {
      return chatHttpJson<ApiChatMessage>({
        baseUrl: baseUrl,
        path:
          "/messages/" +
          encodeURIComponent(messageId) +
          encodeQuery({ threadId: chatId }),
        method: "PATCH",
        body: { body: body },
        getAccessToken: getAccessToken,
      }).then(function (message) {
        return mapMessage(message, getCurrentUserId());
      });
    },

    deleteMessage: function (chatId, messageId) {
      return chatHttpJson<void>({
        baseUrl: baseUrl,
        path:
          "/messages/" +
          encodeURIComponent(messageId) +
          encodeQuery({ threadId: chatId }),
        method: "DELETE",
        getAccessToken: getAccessToken,
      });
    },

    markConversationRead: function (chatId, lastReadMessageId) {
      return chatHttpJson<void>({
        baseUrl: baseUrl,
        path: "/threads/" + encodeURIComponent(chatId) + "/read",
        method: "PATCH",
        body: { lastReadMessageId: lastReadMessageId },
        getAccessToken: getAccessToken,
      });
    },

    listReadReceipts: function (chatId) {
      return chatHttpJson<ChatReadReceiptsResponse>({
        baseUrl: baseUrl,
        path: "/threads/" + encodeURIComponent(chatId) + "/read-receipts",
        getAccessToken: getAccessToken,
      });
    },

    setTyping: function (chatId, isTyping) {
      return chatHttpJson<void>({
        baseUrl: baseUrl,
        path: "/threads/" + encodeURIComponent(chatId) + "/typing",
        method: "POST",
        body: { isTyping: isTyping },
        getAccessToken: getAccessToken,
      });
    },

    listTypingUsers: function (chatId) {
      return chatHttpJson<ChatTypingSnapshot>({
        baseUrl: baseUrl,
        path: "/threads/" + encodeURIComponent(chatId) + "/typing",
        getAccessToken: getAccessToken,
      });
    },

    setConversationArchived: function (chatId, archived) {
      return chatHttpJson<void>({
        baseUrl: baseUrl,
        path: "/threads/" + encodeURIComponent(chatId) + "/archive",
        method: "PATCH",
        body: { archived: archived },
        getAccessToken: getAccessToken,
      });
    },

    deleteConversation: function (chatId) {
      return chatHttpJson<void>({
        baseUrl: baseUrl,
        path: "/threads/" + encodeURIComponent(chatId),
        method: "DELETE",
        getAccessToken: getAccessToken,
      });
    },

    respondToConversationRequest: function () {
      return Promise.resolve();
    },
  };
}
