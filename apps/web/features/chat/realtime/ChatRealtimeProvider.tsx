"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import type { ChatRealtimeEvent, ChatRealtimeTransport } from "./types";
import { createNoopChatRealtimeTransport } from "./noopTransport";
import { applyChatRealtimeEvent } from "./applyRealtimeEvent";
import { createAblyChatRealtimeTransport } from "./ablyTransport";

interface ChatRealtimeContextValue {
  transport: ChatRealtimeTransport;
  emitDevEvent?: (event: ChatRealtimeEvent) => void;
}

const ChatRealtimeContext = createContext<ChatRealtimeContextValue | null>(
  null
);

interface ChatRealtimeProviderProps {
  children: ReactNode;
  transport?: ChatRealtimeTransport;
  enabled?: boolean;
  userId?: string | null;
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
    return fallbackTransport;
  }

  const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY?.trim();
  if (!apiKey) {
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
}: ChatRealtimeProviderProps) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [fallbackTransport] = useState(createNoopChatRealtimeTransport);
  const threadId = useMemo(
    function () {
      return getActiveThreadId(pathname);
    },
    [pathname]
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

  useEffect(
    function () {
      transport.connect();
      const unsub = transport.subscribe(function (event) {
        applyChatRealtimeEvent(queryClient, event);
      });
      return function () {
        unsub();
        transport.disconnect();
      };
    },
    [queryClient, transport]
  );

  const emitDevEvent = useCallback(
    function (event: ChatRealtimeEvent) {
      applyChatRealtimeEvent(queryClient, event);
    },
    [queryClient]
  );

  const value = useMemo(
    function (): ChatRealtimeContextValue {
      return {
        transport: transport,
        emitDevEvent:
          process.env.NODE_ENV === "development" ? emitDevEvent : undefined,
      };
    },
    [transport, emitDevEvent]
  );

  return (
    <ChatRealtimeContext.Provider value={value}>
      {children}
    </ChatRealtimeContext.Provider>
  );
}

export function useChatRealtime(): ChatRealtimeContextValue {
  const ctx = useContext(ChatRealtimeContext);
  if (!ctx) {
    return {
      transport: createNoopChatRealtimeTransport(),
    };
  }
  return ctx;
}
