import { Buffer } from "node:buffer";
import type { ChatMember, ChatMessage } from "@35mm/types";
import type { AuthUser } from "../../lib/middleware.js";
import { loadEnv } from "../../lib/env.js";

const ABLY_REST_ORIGIN = "https://rest.ably.io";
const DIRECT_INBOX_FANOUT_LIMIT = 25;

type PublishResult = {
  ok: boolean;
  skippedLargeFanout?: boolean;
};

function apiKey(): string {
  return loadEnv().ABLY_API_KEY.trim();
}

function authHeader(key: string): string {
  return "Basic " + Buffer.from(key).toString("base64");
}

async function publishAbly(channel: string, name: string, data: unknown): Promise<boolean> {
  var key = apiKey();
  if (!key) return false;

  try {
    var response = await fetch(
      ABLY_REST_ORIGIN + "/channels/" + encodeURIComponent(channel) + "/messages",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: authHeader(key),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, data }),
      }
    );
    if (!response.ok) {
      console.warn("[chat.realtime] Ably publish failed", {
        channel,
        name,
        status: response.status,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[chat.realtime] Ably publish error", { channel, name, error });
    return false;
  }
}

async function allOk(tasks: Array<Promise<boolean>>): Promise<boolean> {
  var results = await Promise.allSettled(tasks);
  return results.every(function (result) {
    return result.status === "fulfilled" && result.value;
  });
}

export async function publishChatMessageCreated(input: {
  threadId: string;
  senderId: string;
  message: ChatMessage;
  members: ChatMember[];
  unreadCounts: Record<string, number>;
}): Promise<PublishResult> {
  var recipients = input.members.filter(function (member) {
    return member.userId !== input.senderId;
  });
  var threadOk = await publishAbly(
    "thread:" + input.threadId,
    "message.new",
    input.message
  );

  if (recipients.length > DIRECT_INBOX_FANOUT_LIMIT) {
    return { ok: false, skippedLargeFanout: true };
  }

  var inboxOk = await allOk(
    recipients.map(function (member) {
      return publishAbly("user:" + member.userId + ":inbox", "thread.updated", {
        threadId: input.threadId,
        lastMessageAt: input.message.createdAt,
        lastMessagePreview: input.message.body ?? "",
        senderId: input.senderId,
        unreadCount: input.unreadCounts[member.userId + ":" + input.threadId] ?? 0,
      });
    })
  );

  return { ok: threadOk && inboxOk };
}

export async function publishChatTyping(input: {
  threadId: string;
  user: AuthUser;
  isTyping: boolean;
}): Promise<boolean> {
  return publishAbly("thread:" + input.threadId, "typing.update", {
    userId: input.user.userId,
    username: input.user.username,
    avatarUrl: input.user.avatarUrl,
    isTyping: input.isTyping,
  });
}

export async function publishChatReadReceipt(input: {
  threadId: string;
  user: AuthUser;
  lastReadMessageId: string;
}): Promise<boolean> {
  return publishAbly("thread:" + input.threadId, "message.read", {
    userId: input.user.userId,
    username: input.user.username,
    lastReadMessageId: input.lastReadMessageId,
    readAt: new Date().toISOString(),
  });
}
