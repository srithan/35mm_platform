"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { ChatPreview } from "../types";
import { useConversationRow } from "../hooks/useChatQueries";
import { ChatContent } from "./ChatContent";
import { ChatConversation } from "./ChatConversation";
import { ChatMobileHeader } from "./ChatMobileHeader";
import { useIsDesktopMd } from "@/lib/hooks/useIsDesktopMd";

interface ChatDetailPageProps {
  chatId: string;
  discardDraftIfNoMessages?: boolean;
}

function fallbackChat(chatId: string): ChatPreview {
  return {
    id: chatId,
    name: "Conversation",
    username: "",
    lastMessage: "",
    lastMessageAt: "",
    unread: 0,
    avatarUrl: null,
    avatarBg: "#2a1e30",
    avatarColor: "#9a7ab0",
  };
}

export function ChatDetailPage({
  chatId,
  discardDraftIfNoMessages = false,
}: ChatDetailPageProps) {
  const isDesktop = useIsDesktopMd();
  const [threadSearch, setThreadSearch] = useState("");
  const [threadSearchPanelOpen, setThreadSearchPanelOpen] = useState(false);
  const { row: conversationRow, isLoading: conversationLoading } = useConversationRow(chatId);
  const chat = conversationRow ?? fallbackChat(chatId);

  const conversationArchived = Boolean(conversationRow?.archived);

  useEffect(
    function () {
      setThreadSearch("");
      setThreadSearchPanelOpen(false);
    },
    [chatId]
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
        <ChatContent
          selectedId={chat.id}
          discardDraftIfNoMessages={discardDraftIfNoMessages}
        />
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
        isLoading={conversationLoading && !conversationRow}
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
          chatAvatarUrl={chat.avatarUrl}
          avatarBg={chat.avatarBg}
          avatarColor={chat.avatarColor}
          conversationLoading={conversationLoading}
          hideHeader
          fixedInputOnMobile
          discardDraftIfNoMessages={discardDraftIfNoMessages}
          threadSearchQuery={threadSearch}
          onThreadSearchQueryChange={setThreadSearch}
        />
      </div>
    </div>
  );
}
