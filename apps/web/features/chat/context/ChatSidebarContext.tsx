"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "35mm.chat.sidebarCollapsed";

function readStored(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch (_e) {
    return false;
  }
}

function writeStored(collapsed: boolean): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch (_e) {}
}

interface ChatSidebarContextValue {
  collapsed: boolean;
  toggleCollapse: () => void;
}

const ChatSidebarContext = createContext<ChatSidebarContextValue | null>(null);

/**
 * Wraps all `/chat` routes so list collapse state survives `/chat` ↔ `/chat/[id]`
 * without remounting — avoids spurious grid transitions when switching threads.
 */
export function ChatSidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useLayoutEffect(function () {
    setCollapsed(readStored());
  }, []);

  const toggleCollapse = useCallback(function () {
    setCollapsed(function (v) {
      const next = !v;
      writeStored(next);
      return next;
    });
  }, []);

  const value = useMemo(
    function (): ChatSidebarContextValue {
      return { collapsed: collapsed, toggleCollapse: toggleCollapse };
    },
    [collapsed, toggleCollapse]
  );

  return (
    <ChatSidebarContext.Provider value={value}>
      {children}
    </ChatSidebarContext.Provider>
  );
}

export function useChatSidebar(): ChatSidebarContextValue {
  const ctx = useContext(ChatSidebarContext);
  if (!ctx) {
    throw new Error("useChatSidebar must be used within ChatSidebarProvider");
  }
  return ctx;
}
