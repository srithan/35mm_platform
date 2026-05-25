"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface ChatInputFocusValue {
  chatInputFocused: boolean;
  setChatInputFocused: (focused: boolean) => void;
}

const ChatInputFocusContext = createContext<ChatInputFocusValue>({
  chatInputFocused: false,
  setChatInputFocused: function () {},
});

export function ChatInputFocusProvider({ children }: { children: React.ReactNode }) {
  const [chatInputFocused, setChatInputFocused] = useState(false);

  const value = useMemo(
    function () {
      return {
        chatInputFocused,
        setChatInputFocused,
      };
    },
    [chatInputFocused]
  );

  return <ChatInputFocusContext.Provider value={value}>{children}</ChatInputFocusContext.Provider>;
}

export function useChatInputFocus(): ChatInputFocusValue {
  return useContext(ChatInputFocusContext);
}
