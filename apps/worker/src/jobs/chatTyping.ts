import { Rest } from "ably";
import { eq } from "drizzle-orm";
import { profiles } from "@35mm/db";
import { loadWorkerEnv } from "../lib/env.js";
import { getWorkerDb } from "./chatShared.js";

export interface ChatTypingPayload {
  threadId: string;
  userId: string;
  isTyping: boolean;
}

let ablyRest: Rest | null = null;

function getAbly(apiKey: string): Rest {
  if (!ablyRest) ablyRest = new Rest({ key: apiKey });
  return ablyRest;
}

export async function runChatTypingJob(payload: ChatTypingPayload): Promise<boolean> {
  var apiKey = loadWorkerEnv().ABLY_API_KEY.trim();
  if (!apiKey) {
    console.warn("[chat.typing] Ably disabled");
    return false;
  }
  var rows = await getWorkerDb()
    .select({ username: profiles.username, avatarUrl: profiles.avatarUrl })
    .from(profiles)
    .where(eq(profiles.userId, payload.userId))
    .limit(1);
  await getAbly(apiKey).channels.get(`thread:${payload.threadId}`).publish("typing.update", {
    userId: payload.userId,
    username: rows[0]?.username ?? "unknown",
    avatarUrl: rows[0]?.avatarUrl ?? null,
    isTyping: payload.isTyping,
  });
  return true;
}
