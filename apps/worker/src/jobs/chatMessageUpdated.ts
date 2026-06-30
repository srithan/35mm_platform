import { Rest } from "ably";
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
  await getAbly(apiKey).channels.get(`thread:${payload.threadId}`).publish(eventName(payload.type), message);
  return true;
}
