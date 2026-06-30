import { Rest } from "ably";
import { eq } from "drizzle-orm";
import { profiles } from "@35mm/db";
import { loadWorkerEnv } from "../lib/env.js";
import { getWorkerDb } from "./chatShared.js";

export interface ChatReadReceiptPayload {
  threadId: string;
  userId: string;
  lastReadMessageId: string;
}

let ablyRest: Rest | null = null;

function getAbly(apiKey: string): Rest {
  if (!ablyRest) ablyRest = new Rest({ key: apiKey });
  return ablyRest;
}

export async function runChatReadReceiptJob(payload: ChatReadReceiptPayload): Promise<boolean> {
  var apiKey = loadWorkerEnv().ABLY_API_KEY.trim();
  if (!apiKey) {
    console.warn("[chat.readReceipt] Ably disabled");
    return false;
  }
  var rows = await getWorkerDb()
    .select({ username: profiles.username })
    .from(profiles)
    .where(eq(profiles.userId, payload.userId))
    .limit(1);
  await getAbly(apiKey).channels.get(`thread:${payload.threadId}`).publish("message.read", {
    userId: payload.userId,
    username: rows[0]?.username ?? "unknown",
    lastReadMessageId: payload.lastReadMessageId,
    readAt: new Date().toISOString(),
  });
  return true;
}
