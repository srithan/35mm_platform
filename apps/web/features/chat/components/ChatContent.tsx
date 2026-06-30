"use client";

import { cn } from "@/lib/utils/cn";
import { useChatSidebar } from "../context/ChatSidebarContext";
import { ChatList } from "./ChatList";
import { ChatConversation } from "./ChatConversation";
import { useConversationRow } from "../hooks/useChatQueries";

interface ChatContentProps {
  /** Chat ID from URL (e.g. from /chat/[chatId]) */
  selectedId?: string | null;
}

export function ChatContent({ selectedId: initialSelectedId = null }: ChatContentProps = {}) {
  const { collapsed: sidebarCollapsed, toggleCollapse } = useChatSidebar();
  const selectedId = initialSelectedId;
  const { row: chat, isLoading: chatLoading } = useConversationRow(selectedId);
  const avatar = chat ? { bg: chat.avatarBg, color: chat.avatarColor } : undefined;
  const chatName = chat?.name ?? null;
  const chatUsername = chat?.username ?? null;

  return (
    <div
      className={cn(
        "grid h-full min-h-0 overflow-hidden transition-[grid-template-columns] duration-200",
        sidebarCollapsed ? "grid-cols-[72px_1fr]" : "grid-cols-[400px_1fr]"
      )}
    >
      <div className="min-w-0 h-full overflow-hidden bg-bg">
        <ChatList
          selectedId={selectedId}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleCollapse}
        />
      </div>
      <div className="min-w-0 h-full overflow-hidden bg-bg flex flex-col border-r border-border">
        <ChatConversation
          chatId={selectedId}
          chatName={chatName}
          chatUsername={chatUsername}
          chatAvatarUrl={chat?.avatarUrl}
          avatarBg={avatar?.bg}
          avatarColor={avatar?.color}
          conversationLoading={chatLoading}
        />
      </div>
    </div>
  );
}
