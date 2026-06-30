"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/constants/routes";
import { Icon } from "@/components/Icon/Icon";
import { Avatar } from "@/components/Avatar";
import { useConversationsByUiFilter } from "../hooks/useChatQueries";
import { ChatSearchInput } from "./ChatSearchInput";
import { NewChatComposeButton } from "./NewChatComposeButton";
import { useNewChat } from "../context/NewChatContext";

export type { ChatPreview } from "../types";

interface ChatListProps {
  selectedId?: string | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  showHeader?: boolean;
  /** Filter by name, @handle, or last message (client-side). */
  searchQuery?: string;
  /**
   * When set, inbox vs archived is controlled by the parent (e.g. mobile tabs).
   * Omit on desktop to use the built-in Inbox / Archived control under the header.
   */
  conversationFilter?: "active" | "archived" | "requests";
  onConversationFilterChange?: (filter: "active" | "archived") => void;
}

function ChatListSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="animate-pulse px-4 py-2 space-y-0" aria-hidden>
      {[0, 1, 2, 3, 4].map(function (i) {
        return (
          <div
            key={i}
            className={cn(
              "flex items-center border-b border-border py-3",
              collapsed ? "justify-center px-2" : "gap-3"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-border/80 flex-shrink-0" />
            {!collapsed ? (
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-border/80 rounded w-2/5" />
                <div className="h-3 bg-border/60 rounded w-4/5" />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function ChatList({
  selectedId = null,
  collapsed = false,
  onToggleCollapse,
  showHeader = true,
  searchQuery = "",
  conversationFilter: conversationFilterProp,
  onConversationFilterChange,
}: ChatListProps) {
  const pathname = usePathname() ?? "";
  const routeId = pathname.replace("/chat/", "").split("/")[0] || null;
  const activeId = selectedId ?? (routeId ? routeId.toUpperCase() : null);
  const [headerListSearch, setHeaderListSearch] = useState("");
  const [internalInboxFilter, setInternalInboxFilter] = useState<
    "active" | "archived"
  >("active");
  const uiFolder =
    conversationFilterProp !== undefined
      ? conversationFilterProp
      : internalInboxFilter;
  const { data: chats, isLoading, isError, refetch } =
    useConversationsByUiFilter(uiFolder);
  const { openNewChat } = useNewChat();
  const syncedSelectedIdRef = useRef<string | null | undefined>(undefined);

  useEffect(
    function () {
      if (conversationFilterProp !== undefined || !chats) {
        return;
      }
      if (syncedSelectedIdRef.current === selectedId) {
        return;
      }
      syncedSelectedIdRef.current = selectedId;
      if (!selectedId) {
        return;
      }
      const row = chats.find(function (c) {
        return c.id === selectedId;
      });
      if (row) {
        setInternalInboxFilter(
          row.archived ? "archived" : "active"
        );
      }
    },
    [selectedId, chats, conversationFilterProp]
  );

  const effectiveSearch = showHeader ? headerListSearch : searchQuery;

  const inboxSegment: "active" | "archived" | "requests" = uiFolder;

  function setInboxSegment(next: "active" | "archived"): void {
    if (conversationFilterProp !== undefined) {
      onConversationFilterChange?.(next);
    } else {
      setInternalInboxFilter(next);
    }
  }

  const filtered = useMemo(
    function () {
      const list = chats ?? [];
      const q = effectiveSearch.trim().toLowerCase();
      if (!q) {
        return list;
      }
      return list.filter(function (c) {
        return (
          c.name.toLowerCase().indexOf(q) !== -1 ||
          c.username.toLowerCase().indexOf(q) !== -1 ||
          c.lastMessage.toLowerCase().indexOf(q) !== -1
        );
      });
    },
    [chats, effectiveSearch]
  );

  return (
    <div className="flex flex-col h-full min-h-0 border-r border-border bg-bg select-none">
      {showHeader ? (
        <div
          className={cn(
            "shrink-0 border-b border-border transition-colors",
            collapsed ? "px-2 py-3" : "px-4 py-3.5"
          )}
        >
          <div
            className={cn(
              "flex gap-2",
              collapsed ? "flex-col items-center justify-center" : "flex-col"
            )}
          >
            {!collapsed ? (
              <>
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <h1 className="font-sans text-[20px] font-semibold tracking-[-0.02em] text-fg">
                      Chat
                    </h1>
                    <NewChatComposeButton size="sm" />
                  </div>
                  {onToggleCollapse ? (
                    <button
                      type="button"
                      onClick={onToggleCollapse}
                      className="p-2 text-fg-muted hover:text-fg hover:bg-hover rounded-full transition-colors shrink-0"
                      aria-label="Collapse sidebar"
                      title="Collapse to avatars only"
                    >
                      <Icon name="chevrons-left" className="w-4 h-4" strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
                <ChatSearchInput
                  value={headerListSearch}
                  onChange={setHeaderListSearch}
                  placeholder="Search people or messages"
                  className="mt-1"
                  ariaLabel="Search people or messages"
                />
                <div
                  className="mt-3 flex rounded-xl border border-border bg-sunken p-0.5"
                  role="tablist"
                  aria-label="Conversation folders"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={inboxSegment === "active"}
                    onClick={function () {
                      setInboxSegment("active");
                    }}
                    className={cn(
                      "flex-1 rounded-[10px] py-2 text-[12px] font-semibold transition-colors",
                      inboxSegment === "active"
                        ? "bg-elevated text-fg shadow-sm"
                        : "text-fg-muted hover:text-fg"
                    )}
                  >
                    Inbox
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={inboxSegment === "archived"}
                    onClick={function () {
                      setInboxSegment("archived");
                    }}
                    className={cn(
                      "flex-1 rounded-[10px] py-2 text-[12px] font-semibold transition-colors",
                      inboxSegment === "archived"
                        ? "bg-elevated text-fg shadow-sm"
                        : "text-fg-muted hover:text-fg"
                    )}
                  >
                    Archived
                  </button>
                </div>
              </>
            ) : null}
            {collapsed && onToggleCollapse ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-2 text-fg-muted hover:text-fg hover:bg-hover rounded-full transition-colors"
                aria-label="Expand sidebar"
                title="Expand chat list"
              >
                <Icon name="chevrons-right" className="w-4 h-4" strokeWidth={2} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <ChatListSkeleton collapsed={collapsed} />
        ) : isError ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[13px] text-fg-muted mb-2">Couldn&apos;t load conversations.</p>
            <button
              type="button"
              onClick={function () {
                refetch();
              }}
              className="text-[13px] font-semibold text-[#007AFF]"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-[13px] text-fg-muted">
            {effectiveSearch.trim()
              ? "No matches."
              : inboxSegment === "archived"
                ? "No archived chats."
                : inboxSegment === "requests"
                  ? "No pending requests."
                  : (
                    <div className="space-y-3">
                      <p>No messages yet.</p>
                      <button
                        type="button"
                        onClick={openNewChat}
                        className="inline-flex items-center justify-center rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
                      >
                        New message
                      </button>
                    </div>
                  )}
          </div>
        ) : (
          filtered.map(function (chat) {
            const href = ROUTES.CHAT_WITH(chat.id);
            const isActive = activeId === chat.id;
            return (
              <Link
                key={chat.id}
                href={href}
                className={cn(
                  "w-full flex items-center border-b border-black/[0.04] dark:border-white/[0.06] transition-colors hover:bg-hover cursor-pointer no-underline text-inherit",
                  isActive && "bg-white/80 dark:bg-white/[0.04]",
                  collapsed
                    ? "justify-center py-3 px-2"
                    : "items-start gap-3 px-4 py-3 text-left"
                )}
              >
                <Avatar
                  initial={chat.name.charAt(0)}
                  src={chat.avatarUrl}
                  className={cn(
                    "w-11 h-11 text-[15px] shadow-sm ring-1 ring-black/[0.04]",
                    isActive && "ring-2 ring-[#007AFF] ring-offset-2 ring-offset-bg"
                  )}
                  loading="eager"
                />
                {!collapsed ? (
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-[14px] text-fg truncate tracking-[-0.01em]">
                        {chat.name}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {chat.unread !== undefined && chat.unread > 0 ? (
                          <span className="text-[10px] font-semibold min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#007AFF] text-white tabular-nums">
                            {chat.unread > 99 ? "99+" : chat.unread}
                          </span>
                        ) : null}
                        <span className="text-[11px] text-fg-muted tabular-nums">
                          {chat.lastMessageAt}
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] text-fg-muted line-clamp-2 leading-snug">
                      {chat.lastMessage}
                    </p>
                  </div>
                ) : null}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
