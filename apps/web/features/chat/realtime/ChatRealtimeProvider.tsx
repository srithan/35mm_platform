"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { getChatApiClient } from "../api/getChatApiClient";
import type { ChatRealtimeEvent, ChatRealtimeTransport } from "./types";
import { createNoopChatRealtimeTransport } from "./noopTransport";
import { applyChatRealtimeEvent } from "./applyRealtimeEvent";
import { createAblyChatRealtimeTransport } from "./ablyTransport";
import {
  ChatRealtimeContext,
  type ChatReadReceiptState,
  type ChatRealtimeContextValue,
  type TypingUserState,
} from "./state";

const TYPING_EXPIRES_MS = 5_000;

interface ChatRealtimeProviderProps {
  children: ReactNode;
  transport?: ChatRealtimeTransport;
  enabled?: boolean;
  userId?: string | null;
  activeThreadId?: string | null;
}

function getActiveThreadId(pathname: string | null): string | null {
  if (!pathname) {
    return null;
  }
  const segments = pathname.split("/").filter(Boolean);
  const chatIndex = segments.indexOf("chat");
  const encodedThreadId = chatIndex >= 0 ? segments[chatIndex + 1] : null;
  if (!encodedThreadId) {
    return null;
  }
  try {
    return decodeURIComponent(encodedThreadId).toUpperCase();
  } catch (_err) {
    return encodedThreadId.toUpperCase();
  }
}

function buildTransport(
  enabled: boolean,
  userId: string | null | undefined,
  threadId: string | null,
  fallbackTransport: ChatRealtimeTransport
): ChatRealtimeTransport {
  if (!enabled || !userId) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[chat-realtime] noop transport: auth/profile user is not ready");
    }
    return fallbackTransport;
  }

  const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[chat-realtime] noop transport: NEXT_PUBLIC_ABLY_API_KEY is missing");
    }
    return fallbackTransport;
  }

  return createAblyChatRealtimeTransport({
    apiKey,
    userId,
    threadId,
  });
}

export function ChatRealtimeProvider({
  children,
  transport: transportProp,
  enabled = false,
  userId = null,
  activeThreadId = null,
}: ChatRealtimeProviderProps) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [fallbackTransport] = useState(createNoopChatRealtimeTransport);
  const [typingByChat, setTypingByChat] = useState<
    Record<string, Record<string, TypingUserState>>
  >({});
  const [readReceiptByChat, setReadReceiptByChat] = useState<
    Record<string, ChatReadReceiptState>
  >({});
  const routeThreadId = useMemo(
    function () {
      return getActiveThreadId(pathname);
    },
    [pathname]
  );
  const threadId = routeThreadId ?? activeThreadId;
  const isRealtimeConfigured = useMemo(
    function () {
      if (transportProp) {
        return true;
      }
      return Boolean(
        enabled &&
          userId &&
          process.env.NEXT_PUBLIC_ABLY_API_KEY?.trim()
      );
    },
    [enabled, transportProp, userId]
  );
  const transport = useMemo(
    function () {
      if (transportProp) {
        return transportProp;
      }
      return buildTransport(enabled, userId, threadId, fallbackTransport);
    },
    [enabled, fallbackTransport, threadId, transportProp, userId]
  );

  const applyRealtimeUiEvent = useCallback(
    function (event: ChatRealtimeEvent): void {
      if (event.type === "typing") {
        if (!event.chatId || event.userId === userId) {
          return;
        }
        setTypingByChat(function (prev) {
          const prevChat = prev[event.chatId] ?? {};
          const nextChat = { ...prevChat };
          if (event.isTyping) {
            nextChat[event.userId] = {
              userId: event.userId,
              username: event.username,
              avatarUrl: event.avatarUrl,
              expiresAt: Date.now() + TYPING_EXPIRES_MS,
            };
          } else {
            delete nextChat[event.userId];
          }
          return {
            ...prev,
            [event.chatId]: nextChat,
          };
        });
        return;
      }
      if (event.type === "read_receipt") {
        if (event.userId && event.userId === userId) {
          return;
        }
        setReadReceiptByChat(function (prev) {
          return {
            ...prev,
            [event.chatId]: {
              userId: event.userId,
              username: event.username,
              messageId: event.messageId,
              readAt: event.readAt,
            },
          };
        });
      }
    },
    [userId]
  );

  useEffect(
    function () {
      transport.connect();
      const unsub = transport.subscribe(function (event) {
        applyChatRealtimeEvent(queryClient, event);
        applyRealtimeUiEvent(event);
      });
      return function () {
        unsub();
        transport.disconnect();
      };
    },
    [applyRealtimeUiEvent, queryClient, transport]
  );

  useEffect(
    function () {
      if (!enabled || !userId) {
        return;
      }

      let disposed = false;
      let lastPingAt = 0;

      function pingPresence(force: boolean): void {
        if (disposed || document.visibilityState === "hidden") {
          return;
        }
        const now = Date.now();
        if (!force && now - lastPingAt < 15_000) {
          return;
        }
        lastPingAt = now;
        getChatApiClient().pingPresence().catch(function (error) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[chat-presence] heartbeat failed", error);
          }
        });
      }

      pingPresence(true);
      const intervalId = window.setInterval(function () {
        pingPresence(false);
      }, 45_000);
      const onVisible = function () {
        if (document.visibilityState === "visible") {
          pingPresence(true);
        }
      };
      const onFocus = function () {
        pingPresence(false);
      };
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onFocus);

      return function () {
        disposed = true;
        window.clearInterval(intervalId);
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("focus", onFocus);
      };
    },
    [enabled, userId]
  );

  useEffect(
    function () {
      const intervalId = window.setInterval(function () {
        const now = Date.now();
        setTypingByChat(function (prev) {
          let changed = false;
          const next: Record<string, Record<string, TypingUserState>> = {};
          Object.keys(prev).forEach(function (chatId) {
            const users = prev[chatId];
            const nextUsers: Record<string, TypingUserState> = {};
            Object.keys(users).forEach(function (typingUserId) {
              const entry = users[typingUserId];
              if (entry.expiresAt > now) {
                nextUsers[typingUserId] = entry;
              } else {
                changed = true;
              }
            });
            next[chatId] = nextUsers;
          });
          return changed ? next : prev;
        });
      }, 1_000);
      return function () {
        window.clearInterval(intervalId);
      };
    },
    []
  );

  const emitDevEvent = useCallback(
    function (event: ChatRealtimeEvent) {
      applyChatRealtimeEvent(queryClient, event);
      applyRealtimeUiEvent(event);
    },
    [applyRealtimeUiEvent, queryClient]
  );

  const value = useMemo(
    function (): ChatRealtimeContextValue {
      return {
        transport: transport,
        currentUserId: userId,
        isRealtimeConfigured,
        typingByChat,
        readReceiptByChat,
        emitDevEvent:
          process.env.NODE_ENV === "development" ? emitDevEvent : undefined,
      };
    },
    [emitDevEvent, isRealtimeConfigured, readReceiptByChat, transport, typingByChat, userId]
  );

  return (
    <ChatRealtimeContext.Provider value={value}>
      {children}
    </ChatRealtimeContext.Provider>
  );
}
