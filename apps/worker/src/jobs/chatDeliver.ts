import { Rest } from "ably";
import { getUnreadCounts } from "../lib/chatRedis.js";
import { loadWorkerEnv } from "../lib/env.js";
import {
  fetchActiveMembers,
  fetchChatMessageFromKeyspaces,
  fetchProfiles,
  hydrateChatMessage,
} from "./chatShared.js";

export interface ChatDeliverPayload {
  messageId: string;
  threadId: string;
  senderId: string;
  bucket: number;
}

let ablyRest: Rest | null = null;

function getAbly(apiKey: string): Rest {
  if (!ablyRest) ablyRest = new Rest({ key: apiKey });
  return ablyRest;
}

export async function runChatDeliverJob(payload: ChatDeliverPayload): Promise<boolean> {
  var apiKey = loadWorkerEnv().ABLY_API_KEY.trim();
  if (!apiKey) {
    console.warn("[chat.deliver] Ably disabled");
    return false;
  }
  var row = await fetchChatMessageFromKeyspaces(payload);
  if (!row) {
    console.warn("[chat.deliver] message unavailable", payload);
    return false;
  }
  var [profileMap, members] = await Promise.all([
    fetchProfiles([row.sender_id]),
    fetchActiveMembers(payload.threadId),
  ]);
  var message = hydrateChatMessage(row, profileMap, payload.senderId);
  var ably = getAbly(apiKey);
  await ably.channels.get(`thread:${payload.threadId}`).publish("message.new", message);
  var recipientMembers = members.filter(function (member) {
    return member.userId !== payload.senderId;
  });
  var unreadCounts = await getUnreadCounts(
    recipientMembers.map(function (member) {
      return { userId: member.userId, threadId: payload.threadId };
    })
  );
  for (var member of recipientMembers) {
    await ably.channels.get(`user:${member.userId}:inbox`).publish("thread.updated", {
      threadId: payload.threadId,
      lastMessageAt: message.createdAt,
      lastMessagePreview: message.body ?? "",
      senderId: payload.senderId,
      unreadCount: unreadCounts[member.userId + ":" + payload.threadId] ?? 0,
    });
  }
  console.log(`message ${payload.messageId} delivered to ${members.length} members`);
  return true;
}
