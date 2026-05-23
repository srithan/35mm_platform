import { Hono } from "hono";
import type { ChatMessage, ChatPreview } from "@35mm/types";
import { sendMessageSchema } from "@35mm/validators";

export const chatRoutes = new Hono();

const conversations: ChatPreview[] = [
  {
    id: "conv_001",
    name: "Editorial Circle",
    username: "editorial",
    lastMessage: "Let us turn this into a real API contract.",
    lastMessageAt: "now",
    unread: 0
  }
];

const messages: ChatMessage[] = [
  {
    id: "msg_001",
    conversationId: "conv_001",
    sender: {
      id: "user_001",
      username: "srithan",
      displayName: "Srithan"
    },
    text: "The chat surface is ready for realtime transport and durable storage.",
    createdAt: new Date("2026-05-20T12:00:00.000Z").toISOString()
  }
];

chatRoutes.get("/conversations", function (c) {
  return c.json({
    items: conversations,
    nextCursor: null,
    hasMore: false
  });
});

chatRoutes.get("/conversations/:conversationId/messages", function (c) {
  const conversationId = c.req.param("conversationId");
  return c.json({
    items: messages.filter((message) => message.conversationId === conversationId),
    nextCursor: null,
    hasMore: false
  });
});

chatRoutes.post("/conversations/:conversationId/messages", async function (c) {
  const conversationId = c.req.param("conversationId");
  const input = sendMessageSchema.parse(await c.req.json());
  const message: ChatMessage = {
    id: `msg_${messages.length + 1}`,
    conversationId,
    sender: {
      id: "user_current",
      username: "current_user",
      displayName: "Current User"
    },
    text: input.text,
    createdAt: new Date().toISOString()
  };

  messages.push(message);
  return c.json({ message }, 201);
});
