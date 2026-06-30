"use client";

import { createContext, useContext } from "react";
import type { ChatRealtimeEvent, ChatRealtimeTransport } from "./types";
import { createNoopChatRealtimeTransport } from "./noopTransport";

export interface ChatTypingUser {
  userId: string;
  username?: string | null;
  avatarUrl?: string | null;
}

export interface ChatReadReceiptState {
  userId?: string | null;
  username?: string | null;
  messageId: string;
  readAt: string;
}

export type TypingUserState = ChatTypingUser & {
  expiresAt: number;
};

export interface ChatRealtimeContextValue {
  transport: ChatRealtimeTransport;
  currentUserId: string | null;
  isRealtimeConfigured: boolean;
  typingByChat: Record<string, Record<string, TypingUserState>>;
  readReceiptByChat: Record<string, ChatReadReceiptState>;
  emitDevEvent?: (event: ChatRealtimeEvent) => void;
}

export const ChatRealtimeContext = createContext<ChatRealtimeContextValue | null>(
  null
);

export function useChatRealtime(): ChatRealtimeContextValue {
  const ctx = useContext(ChatRealtimeContext);
  if (!ctx) {
    return {
      transport: createNoopChatRealtimeTransport(),
      currentUserId: null,
      isRealtimeConfigured: false,
      typingByChat: {},
      readReceiptByChat: {},
    };
  }
  return ctx;
}

export function useChatTypingUsers(chatId: string | null): ChatTypingUser[] {
  const ctx = useChatRealtime();
  if (!chatId) {
    return [];
  }
  return Object.values(ctx.typingByChat[chatId] ?? {}).map(function (entry) {
    return {
      userId: entry.userId,
      username: entry.username,
      avatarUrl: entry.avatarUrl,
    };
  });
}

export function useChatReadReceipt(
  chatId: string | null
): ChatReadReceiptState | null {
  const ctx = useChatRealtime();
  if (!chatId) {
    return null;
  }
  return ctx.readReceiptByChat[chatId] ?? null;
}

export function useIsChatRealtimeConfigured(): boolean {
  return useChatRealtime().isRealtimeConfigured;
}
