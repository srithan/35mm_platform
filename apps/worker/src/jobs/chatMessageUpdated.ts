import { Rest } from "ably";
import { getUnreadCounts } from "../lib/chatRedis.js";
import { loadWorkerEnv } from "../lib/env.js";
import {
  fetchChatMessageFromKeyspaces,
  fetchProfiles,
  hydrateChatMessage,
} from "./chatShared.js";

export interface ChatMessageUpdatedPayload {
  messageId: string;
  threadId: string;
  bucket: number;
  type: "edit" | "delete" | "reaction";
  reactionRecipientId?: string;
  reactionActorId?: string;
  reactionPreview?: string;
  reactionAt?: string;
}

let ablyRest: Rest | null = null;

function eventName(type: ChatMessageUpdatedPayload["type"]) {
  if (type === "edit") return "message.edited";
  if (type === "delete") return "message.deleted";
  return "message.reaction";
}

function getAbly(apiKey: string): Rest {
  if (!ablyRest) ablyRest = new Rest({ key: apiKey });
  return ablyRest;
}

export async function runChatMessageUpdatedJob(payload: ChatMessageUpdatedPayload): Promise<boolean> {
  var apiKey = loadWorkerEnv().ABLY_API_KEY.trim();
  if (!apiKey) {
    console.warn("[chat.messageUpdated] Ably disabled");
    return false;
  }
  var row = await fetchChatMessageFromKeyspaces(payload);
  if (!row) {
    console.warn("[chat.messageUpdated] message unavailable", payload);
    return false;
  }
  var profileMap = await fetchProfiles([row.sender_id]);
  var message = hydrateChatMessage(row, profileMap, row.sender_id);
  var ably = getAbly(apiKey);
  await ably.channels.get(`thread:${payload.threadId}`).publish(eventName(payload.type), message);
  if (
    payload.type === "reaction" &&
    payload.reactionRecipientId &&
    payload.reactionActorId &&
    payload.reactionPreview
  ) {
    var unreadCounts = await getUnreadCounts([
      { userId: payload.reactionRecipientId, threadId: payload.threadId },
    ]);
    await ably.channels.get(`user:${payload.reactionRecipientId}:inbox`).publish("thread.updated", {
      threadId: payload.threadId,
      lastMessageAt: payload.reactionAt ?? new Date().toISOString(),
      lastMessagePreview: payload.reactionPreview,
      senderId: payload.reactionActorId,
      unreadCount: unreadCounts[payload.reactionRecipientId + ":" + payload.threadId] ?? 0,
    });
  }
  return true;
}
