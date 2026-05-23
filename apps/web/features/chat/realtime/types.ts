/**
 * WebSocket / SSE event shapes — invalidate or patch TanStack Query cache from transport.
 */

import type { ChatMessage, ChatPreview } from "../types";

export type ChatRealtimeEvent =
  | {
      type: "message.created";
      chatId: string;
      message: ChatMessage;
    }
  | {
      type: "message.updated";
      chatId: string;
      message: ChatMessage;
    }
  | {
      type: "message.deleted";
      chatId: string;
      messageId: string;
    }
  | {
      type: "conversation.updated";
      conversation: ChatPreview;
    }
  | {
      type: "conversation.deleted";
      chatId: string;
    }
  | {
      type: "typing";
      chatId: string;
      userId: string;
      isTyping: boolean;
    }
  | {
      type: "read_receipt";
      chatId: string;
      messageId: string;
      readAt: string;
    };

export type ChatRealtimeUnsubscribe = () => void;

export interface ChatRealtimeTransport {
  subscribe: (
    handler: (event: ChatRealtimeEvent) => void
  ) => ChatRealtimeUnsubscribe;
  connect: () => void;
  disconnect: () => void;
}
