import type { ChatMessage, ChatSendPayload } from "../types";

export function createOptimisticMessageId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return "optimistic-" + crypto.randomUUID();
  }
  return "optimistic-" + String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);
}

export function buildOptimisticChatMessage(
  args: { chatId: string } & ChatSendPayload,
  optimisticId: string
): ChatMessage {
  var message: ChatMessage = {
    id: optimisticId,
    chatId: args.chatId,
    text: args.text.trim(),
    isOwn: true,
    createdAt: new Date().toISOString(),
    status: "sending",
    reactions: [],
  };

  if (args.gifUrl) {
    message.media = { type: "gif", url: args.gifUrl };
  } else if (args.imageDataUrl) {
    message.media = { type: "image", url: args.imageDataUrl };
  } else if (args.file) {
    message.file = {
      name: args.file.name,
      sizeLabel: args.file.sizeLabel,
    };
  }

  return message;
}
