"use client";

import * as Ably from "ably";
import type {
  ChatMessage as ApiChatMessage,
  ChatMessageContentType,
} from "@35mm/types";
import type { ChatMessage } from "../types";
import type { ChatRealtimeEvent, ChatRealtimeTransport } from "./types";

type AblyChatTransportInput = {
  apiKey: string;
  userId: string;
  threadId: string | null;
};

type ReadReceiptPayload = {
  userId?: unknown;
  username?: unknown;
  lastReadMessageId?: unknown;
  readAt?: unknown;
};

type TypingPayload = {
  userId?: unknown;
  username?: unknown;
  avatarUrl?: unknown;
  isTyping?: unknown;
};

type ThreadUpdatedPayload = {
  threadId?: unknown;
  lastMessageAt?: unknown;
  lastMessagePreview?: unknown;
  unreadCount?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isContentType(value: unknown): value is ChatMessageContentType {
  return (
    value === "text" ||
    value === "image" ||
    value === "gif" ||
    value === "file" ||
    value === "link"
  );
}

function isApiChatMessage(value: unknown): value is ApiChatMessage {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.threadId === "string" &&
    typeof value.senderId === "string" &&
    typeof value.createdAt === "string" &&
    isContentType(value.contentType)
  );
}

function formatBytes(value: number | undefined): string | undefined {
  if (!value || !Number.isFinite(value)) return undefined;
  if (value < 1024) return String(value) + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(value < 10240 ? 1 : 0) + " KB";
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

function fileNameFromMessage(message: ApiChatMessage): string {
  const mimeType = message.mediaMetadata?.mimeType;
  if (mimeType) {
    const subtype = mimeType.split("/")[1];
    return subtype ? "Attachment." + subtype : "Attachment";
  }
  try {
    const url = message.mediaUrl ? new URL(message.mediaUrl) : null;
    const leaf = url?.pathname.split("/").filter(Boolean).pop();
    return leaf ? decodeURIComponent(leaf) : "Attachment";
  } catch (_err) {
    return "Attachment";
  }
}

function mapMessage(message: ApiChatMessage, currentUserId: string): ChatMessage {
  let media: ChatMessage["media"];
  let file: ChatMessage["file"];

  if (!message.isDeleted && message.mediaUrl) {
    if (message.contentType === "gif" || message.contentType === "image") {
      media = {
        type: message.contentType === "gif" ? "gif" : "image",
        url: message.mediaUrl,
      };
    } else {
      file = {
        name: fileNameFromMessage(message),
        sizeLabel: formatBytes(message.mediaMetadata?.size),
      };
    }
  }

  return {
    id: message.id,
    chatId: message.threadId,
    text: message.isDeleted ? "Message deleted" : message.body ?? "",
    isOwn: message.senderId === currentUserId,
    createdAt: message.createdAt,
    status: "delivered",
    senderAvatarUrl: message.senderAvatarUrl,
    editedAt: message.editedAt,
    replyTo:
      message.replyToId && message.replySnapshot
        ? {
            id: message.replyToId,
            snippet:
              message.replySnapshot.body ||
              (message.replySnapshot.contentType === "gif"
                ? "GIF"
                : message.replySnapshot.contentType === "image"
                  ? "Photo"
                  : message.replySnapshot.contentType === "file"
                    ? "File"
                    : "Message"),
            isOwn: message.replySnapshot.senderId === currentUserId,
          }
        : undefined,
    reactions: (message.reactions ?? []).map(function (reaction) {
      return {
        emoji: reaction.emoji,
        count: reaction.count,
        includesMe: reaction.userIds.includes(currentUserId),
      };
    }),
    media,
    file,
  };
}

function messageEventFromAbly(
  eventName: string,
  data: unknown,
  currentUserId: string
): ChatRealtimeEvent | null {
  if (!isApiChatMessage(data)) return null;
  if (eventName === "message.deleted" || data.isDeleted) {
    return {
      type: "message.deleted",
      chatId: data.threadId,
      messageId: data.id,
    };
  }
  if (eventName === "message.new") {
    return {
      type: "message.created",
      chatId: data.threadId,
      message: mapMessage(data, currentUserId),
    };
  }
  if (eventName === "message.edited" || eventName === "message.reaction") {
    return {
      type: "message.updated",
      chatId: data.threadId,
      message: mapMessage(data, currentUserId),
    };
  }
  return null;
}

function readReceiptEvent(threadId: string, data: unknown): ChatRealtimeEvent | null {
  if (!isObject(data)) return null;
  const payload = data as ReadReceiptPayload;
  const userId = asString(payload.userId);
  const username = asString(payload.username);
  const messageId = asString(payload.lastReadMessageId);
  const readAt = asString(payload.readAt);
  if (!messageId || !readAt) return null;
  return {
    type: "read_receipt",
    chatId: threadId,
    userId,
    username,
    messageId,
    readAt,
  };
}

function typingEvent(threadId: string, data: unknown): ChatRealtimeEvent | null {
  if (!isObject(data)) return null;
  const payload = data as TypingPayload;
  const userId = asString(payload.userId);
  if (!userId || typeof payload.isTyping !== "boolean") return null;
  return {
    type: "typing",
    chatId: threadId,
    userId,
    username: asString(payload.username),
    avatarUrl: asString(payload.avatarUrl),
    isTyping: payload.isTyping,
  };
}

function threadUpdatedEvent(data: unknown): ChatRealtimeEvent {
  if (!isObject(data)) {
    return { type: "conversation.invalidated" };
  }
  const payload = data as ThreadUpdatedPayload;
  const threadId = asString(payload.threadId);
  if (!threadId) {
    return { type: "conversation.invalidated" };
  }
  return {
    type: "conversation.patch",
    chatId: threadId,
    lastMessage: asString(payload.lastMessagePreview),
    lastMessageAt: asString(payload.lastMessageAt),
    unread: asNumber(payload.unreadCount),
  };
}

function logChannelError(action: "attach" | "detach", channel: string, error: unknown): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  console.warn("[chat-realtime] Ably channel " + action + " failed", {
    channel,
    error,
  });
}

function safeAttach(channel: Ably.RealtimeChannel | null, channelName: string): void {
  if (!channel || channel.state === "attached" || channel.state === "attaching") {
    return;
  }
  void channel.attach().catch(function (error) {
    logChannelError("attach", channelName, error);
  });
}

function safeDetach(channel: Ably.RealtimeChannel | null, channelName: string): void {
  if (!channel || channel.state === "detached" || channel.state === "initialized") {
    return;
  }
  void channel.detach().catch(function (error) {
    logChannelError("detach", channelName, error);
  });
}

export function createAblyChatRealtimeTransport(
  input: AblyChatTransportInput
): ChatRealtimeTransport {
  let realtime: Ably.Realtime | null = null;
  let inboxChannel: Ably.RealtimeChannel | null = null;
  let threadChannel: Ably.RealtimeChannel | null = null;

  function attachChannels(): void {
    if (!realtime) {
      realtime = new Ably.Realtime({
        key: input.apiKey,
        clientId: input.userId,
        echoMessages: false,
      });
      if (process.env.NODE_ENV === "development") {
        realtime.connection.on(function (stateChange) {
          if (stateChange.current === "failed" || stateChange.current === "suspended") {
            console.warn("[chat-realtime] Ably connection " + stateChange.current, stateChange.reason);
          }
        });
      }
    }

    if (!inboxChannel) {
      inboxChannel = realtime.channels.get("user:" + input.userId + ":inbox");
    }

    if (input.threadId && !threadChannel) {
      threadChannel = realtime.channels.get("thread:" + input.threadId);
    }
  }

  return {
    connect: function () {
      attachChannels();
      safeAttach(inboxChannel, "user:" + input.userId + ":inbox");
      if (input.threadId) {
        safeAttach(threadChannel, "thread:" + input.threadId);
      }
    },
    disconnect: function () {
      safeDetach(inboxChannel, "user:" + input.userId + ":inbox");
      if (input.threadId) {
        safeDetach(threadChannel, "thread:" + input.threadId);
      }
      inboxChannel = null;
      threadChannel = null;
      realtime?.close();
      realtime = null;
    },
    subscribe: function (handler) {
      attachChannels();

      function emitMessageEvent(eventName: string) {
        return function (message: Ably.Message): void {
          const event = messageEventFromAbly(eventName, message.data, input.userId);
          if (event) handler(event);
        };
      }

      const onNew = emitMessageEvent("message.new");
      const onEdited = emitMessageEvent("message.edited");
      const onDeleted = emitMessageEvent("message.deleted");
      const onReaction = emitMessageEvent("message.reaction");
      const onRead = function (message: Ably.Message): void {
        if (!input.threadId) return;
        const event = readReceiptEvent(input.threadId, message.data);
        if (event) handler(event);
      };
      const onTyping = function (message: Ably.Message): void {
        if (!input.threadId) return;
        const event = typingEvent(input.threadId, message.data);
        if (event) handler(event);
      };
      const onThreadUpdated = function (message: Ably.Message): void {
        handler(threadUpdatedEvent(message.data));
      };

      threadChannel?.subscribe("message.new", onNew);
      threadChannel?.subscribe("message.edited", onEdited);
      threadChannel?.subscribe("message.deleted", onDeleted);
      threadChannel?.subscribe("message.reaction", onReaction);
      threadChannel?.subscribe("message.read", onRead);
      threadChannel?.subscribe("typing.update", onTyping);
      inboxChannel?.subscribe("thread.updated", onThreadUpdated);

      return function () {
        threadChannel?.unsubscribe("message.new", onNew);
        threadChannel?.unsubscribe("message.edited", onEdited);
        threadChannel?.unsubscribe("message.deleted", onDeleted);
        threadChannel?.unsubscribe("message.reaction", onReaction);
        threadChannel?.unsubscribe("message.read", onRead);
        threadChannel?.unsubscribe("typing.update", onTyping);
        inboxChannel?.unsubscribe("thread.updated", onThreadUpdated);
      };
    },
  };
}
