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
import type { ChatRealtimeEvent, ChatRealtimeTransport } from "./types";
import { createNoopChatRealtimeTransport } from "./noopTransport";
import { applyChatRealtimeEvent } from "./applyRealtimeEvent";

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
}

export function ChatRealtimeProvider({
  children,
  transport: transportProp,
}: ChatRealtimeProviderProps) {
  const queryClient = useQueryClient();
  const [fallbackTransport] = useState(createNoopChatRealtimeTransport);
  const transport = transportProp ?? fallbackTransport;

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
