"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { ChatPreview } from "../data/mockChats";
import { useConversationRow } from "../hooks/useChatQueries";
import { ChatContent } from "./ChatContent";
import { ChatConversation } from "./ChatConversation";
import { ChatMobileHeader } from "./ChatMobileHeader";
import { useIsDesktopMd } from "@/lib/hooks/useIsDesktopMd";

interface ChatDetailPageProps {
  chat: ChatPreview;
}

export function ChatDetailPage({ chat }: ChatDetailPageProps) {
  const isDesktop = useIsDesktopMd();
  const [threadSearch, setThreadSearch] = useState("");
  const [threadSearchPanelOpen, setThreadSearchPanelOpen] = useState(false);
  const { row: conversationRow } = useConversationRow(chat.id);

  const conversationArchived = Boolean(conversationRow?.archived);

  useEffect(
    function () {
      setThreadSearch("");
      setThreadSearchPanelOpen(false);
    },
    [chat.id]
  );

  if (isDesktop === null) {
    return (
      <div
        className="h-full min-h-[50vh] w-full"
        aria-busy="true"
      />
    );
  }

  if (isDesktop) {
    return (
      <div className="h-full">
        <ChatContent selectedId={chat.id} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        threadSearchPanelOpen
          ? "pt-[calc(3rem+max(0.5rem,env(safe-area-inset-top,0px))+3.5rem+0.125rem)]"
          : "pt-[calc(3rem+max(0.5rem,env(safe-area-inset-top,0px))+0.125rem)]"
      )}
    >
      <ChatMobileHeader
        chat={chat}
        conversationArchived={conversationArchived}
        threadSearchQuery={threadSearch}
        onThreadSearchQueryChange={setThreadSearch}
        onThreadSearchPanelOpenChange={setThreadSearchPanelOpen}
      />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ChatConversation
          chatId={chat.id}
          chatName={chat.name}
          chatUsername={chat.username}
          avatarBg={chat.avatarBg}
          avatarColor={chat.avatarColor}
          hideHeader
          fixedInputOnMobile
          threadSearchQuery={threadSearch}
          onThreadSearchQueryChange={setThreadSearch}
        />
      </div>
    </div>
  );
}
