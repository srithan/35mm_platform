"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { BodyPortal } from "@/components/BodyPortal/BodyPortal";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { ROUTES } from "@/lib/constants/routes";
import { usePopoverLayer } from "@/lib/hooks/usePopoverLayer";
import { useIsDesktopMd } from "@/lib/hooks/useIsDesktopMd";
import { cn } from "@/lib/utils/cn";
import {
  useCreateConversation,
  useDeleteConversation,
  useConversationRow,
  useChatPresence,
  useConversations,
  useConversationsByUiFilter,
  useSetConversationArchived,
} from "../hooks/useChatQueries";
import { useChatContactCandidates } from "../hooks/useChatContactCandidates";
import {
  ChatPresenceDot,
  getChatPresenceTargetIds,
  summarizeChatPresence,
  type ChatPresenceSummary,
} from "./ChatPresenceIndicator";
import { useChatRealtime } from "../realtime/state";
import { ChatConversation } from "./ChatConversation";
import type { ChatPreview } from "../types";

interface FloatingChatInboxProps {
  onActiveChatIdChange?: (chatId: string | null) => void;
}

type FloatingChatRowMenuAction = "archive" | "unarchive" | "delete";

function formatUnread(count: number): string {
  if (count > 99) {
    return "99+";
  }
  return String(count);
}

function sumUnread(items: ChatPreview[] | undefined): number {
  if (!items) {
    return 0;
  }
  return items.reduce(function (total, item) {
    const unread = item.unread ?? 0;
    return total + (Number.isFinite(unread) && unread > 0 ? unread : 0);
  }, 0);
}

function FloatingChatPill({
  chats,
  unreadCount,
  onOpen,
}: {
  chats: ChatPreview[];
  unreadCount: number;
  onOpen: () => void;
}) {
  const avatarStack = chats.slice(0, 2);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-5 right-5 z-40 hidden min-h-[52px] w-[260px] items-center justify-between gap-3 rounded-full border border-black/[0.06] bg-bg/95 px-4 py-2 text-left shadow-[0_14px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_18px_54px_rgba(0,0,0,0.22)] md:flex"
      aria-label={
        unreadCount > 0
          ? "Open messages, " + formatUnread(unreadCount) + " unread"
          : "Open messages"
      }
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-6 w-6 items-center justify-center rounded-full text-fg">
          <MessageCircle className="h-7 w-7" strokeWidth={2} />
          {unreadCount > 0 ? (
            <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3045] px-1.5 text-[11px] font-bold text-white ring-2 ring-bg tabular-nums">
              {formatUnread(unreadCount)}
            </span>
          ) : null}
        </span>
        <span className="truncate text-[17px] font-bold text-fg">
          Messages
        </span>
      </span>
      <span className="flex shrink-0 -space-x-2">
        {avatarStack.length > 0 ? (
          avatarStack.map(function (chat) {
            return (
              <Avatar
                key={chat.id}
                initial={chat.name.charAt(0)}
                src={chat.avatarUrl}
                className="h-8 w-8 border-2 border-bg text-[11px] shadow-sm"
                loading="eager"
              />
            );
          })
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-fg-muted">
            <MessageCircle className="h-4 w-4" strokeWidth={2} />
          </span>
        )}
      </span>
    </button>
  );
}

function FloatingChatRowMoreMenu({
  chat,
  onAction,
  disabled,
}: {
  chat: ChatPreview;
  onAction: (chat: ChatPreview, action: FloatingChatRowMenuAction) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(function (): void {
    const button = buttonRef.current;
    if (!button) {
      return;
    }
    const rect = button.getBoundingClientRect();
    const menuWidth = 164;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    setPos({ top: rect.bottom + 6, left: left });
  }, []);

  const dismiss = useCallback(function (): void {
    setOpen(false);
  }, []);

  const isInside = useCallback(function (target: Node): boolean {
    return Boolean(
      buttonRef.current?.contains(target) || menuRef.current?.contains(target)
    );
  }, []);

  usePopoverLayer({
    open: open,
    reposition: updatePosition,
    isInside: isInside,
    onPointerOutsideDismiss: dismiss,
    onEscape: dismiss,
  });

  function emit(action: FloatingChatRowMenuAction): void {
    onAction(chat, action);
    setOpen(false);
  }

  const archived = Boolean(chat.archived);

  return (
    <div className="relative shrink-0 pr-1">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={function (event) {
          event.stopPropagation();
          setOpen(function (current) {
            return !current;
          });
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={"Options for " + chat.name}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2.4} />
      </button>
      {open ? (
        <BodyPortal>
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[300] min-w-[164px] rounded-2xl border border-border bg-elevated py-1.5 text-fg shadow-[0_14px_44px_rgba(0,0,0,0.16)]"
            style={{ top: pos.top, left: pos.left }}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-fg hover:bg-hover"
              onClick={function () {
                emit(archived ? "unarchive" : "archive");
              }}
            >
              {archived ? (
                <ArchiveRestore className="h-4 w-4 shrink-0 text-fg-muted" strokeWidth={2} />
              ) : (
                <Archive className="h-4 w-4 shrink-0 text-fg-muted" strokeWidth={2} />
              )}
              {archived ? "Unarchive" : "Archive"}
            </button>
            <div className="my-1 h-px bg-border" aria-hidden />
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
              onClick={function () {
                emit("delete");
              }}
            >
              <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} />
              Delete
            </button>
          </div>
        </BodyPortal>
      ) : null}
    </div>
  );
}

function FloatingChatListRow({
  chat,
  presenceSummary,
  showPresence,
  selected,
  onSelect,
  onMenuAction,
  actionDisabled,
}: {
  chat: ChatPreview;
  presenceSummary: ChatPresenceSummary;
  showPresence: boolean;
  selected: boolean;
  onSelect: () => void;
  onMenuAction: (chat: ChatPreview, action: FloatingChatRowMenuAction) => void;
  actionDisabled?: boolean;
}) {
  const unread = chat.unread ?? 0;
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-1 transition-colors hover:bg-hover",
        selected && "bg-hover"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
      >
        <span className="relative shrink-0">
          <Avatar
            initial={chat.name.charAt(0)}
            src={chat.avatarUrl}
            className="h-10 w-10 text-[13px] shadow-sm ring-1 ring-black/[0.04]"
            loading="eager"
          />
          {showPresence ? (
            <ChatPresenceDot
              availability={presenceSummary.availability}
              className="absolute -bottom-0.5 -right-0.5"
            />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline justify-between gap-2">
            <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-fg">
              {chat.name}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {unread > 0 ? (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#007AFF] px-1 text-[10px] font-semibold text-white tabular-nums">
                  {formatUnread(unread)}
                </span>
              ) : null}
              <span className="text-[11px] text-fg-muted tabular-nums">
                {chat.lastMessageAt}
              </span>
            </span>
          </span>
          <span
            className={cn(
              "block truncate text-[13px] leading-snug",
              unread > 0 ? "font-bold text-fg" : "text-fg-muted"
            )}
          >
            {unread > 0
              ? formatUnread(unread) + " new message" + (unread === 1 ? "" : "s")
              : chat.lastMessage}
          </span>
        </span>
      </button>
      <FloatingChatRowMoreMenu
        chat={chat}
        onAction={onMenuAction}
        disabled={actionDisabled}
      />
    </div>
  );
}

export function FloatingChatInbox({
  onActiveChatIdChange,
}: FloatingChatInboxProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { currentUserId } = useChatRealtime();
  const pathname = usePathname() ?? "";
  const isDesktop = useIsDesktopMd();
  const isChatRoute =
    pathname === ROUTES.CHAT || Boolean(pathname.startsWith("/chat/"));
  const enabled =
    isLoaded && Boolean(isSignedIn) && isDesktop === true && !isChatRoute;
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSearch, setComposeSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [listFilter, setListFilter] = useState<"active" | "archived">("active");
  const listScrollRef = useRef<HTMLDivElement>(null);
  const listLoadMoreRef = useRef<HTMLDivElement>(null);

  const activeInboxQuery = useConversationsByUiFilter("active", enabled);
  const archivedInboxQuery = useConversationsByUiFilter("archived", enabled && open);
  const requestsQuery = useConversations({ folder: "requests", enabled });
  const createConversationMutation = useCreateConversation();
  const setArchivedMutation = useSetConversationArchived();
  const deleteConversationMutation = useDeleteConversation();
  const contactsQuery = useChatContactCandidates(
    composeSearch,
    enabled && open && composeOpen
  );
  const [deleteChat, setDeleteChat] = useState<ChatPreview | null>(null);
  const listQuery =
    listFilter === "archived" ? archivedInboxQuery : activeInboxQuery;
  const chats = listQuery.data ?? [];
  const visibleChats = useMemo(
    function () {
      return (activeInboxQuery.data ?? []).slice(0, 8);
    },
    [activeInboxQuery.data]
  );
  const filteredChats = useMemo(
    function () {
      const q = listSearch.trim().toLowerCase();
      const list = q
        ? chats.filter(function (chat) {
            return (
              chat.name.toLowerCase().indexOf(q) !== -1 ||
              chat.username.toLowerCase().indexOf(q) !== -1 ||
              chat.lastMessage.toLowerCase().indexOf(q) !== -1
            );
          })
        : chats;
      return list;
    },
    [chats, listSearch]
  );
  const { row: selectedChat, isLoading: selectedChatLoading } =
    useConversationRow(enabled && selectedId ? selectedId : null);
  const presenceUserIds = useMemo(
    function () {
      const ids = new Set<string>();
      const selectedTargetIds = getChatPresenceTargetIds(
        selectedChat?.members,
        currentUserId
      );
      for (var selectedUserId of selectedTargetIds) {
        ids.add(selectedUserId);
        if (ids.size >= 50) {
          return Array.from(ids);
        }
      }
      for (var chat of filteredChats) {
        const targetIds = getChatPresenceTargetIds(chat.members, currentUserId);
        for (var userId of targetIds) {
          ids.add(userId);
          if (ids.size >= 50) {
            return Array.from(ids);
          }
        }
      }
      return Array.from(ids);
    },
    [currentUserId, filteredChats, selectedChat?.members]
  );
  const presence = useChatPresence(presenceUserIds, {
    enabled: enabled && presenceUserIds.length > 0,
  });
  const [presenceNow, setPresenceNow] = useState(Date.now());
  const unreadCount =
    sumUnread(activeInboxQuery.data) + sumUnread(requestsQuery.data);
  const selectedPresenceTargetIds = useMemo(
    function () {
      return getChatPresenceTargetIds(selectedChat?.members, currentUserId);
    },
    [currentUserId, selectedChat?.members]
  );
  const selectedPresenceSummary = useMemo(
    function () {
      return summarizeChatPresence(
        selectedPresenceTargetIds,
        presence.data,
        presenceNow
      );
    },
    [presence.data, presenceNow, selectedPresenceTargetIds]
  );
  const rowActionDisabled =
    setArchivedMutation.isPending || deleteConversationMutation.isPending;

  const canLoadMoreConversations = listQuery.hasNextPage;
  const isLoadingMoreConversations = listQuery.isFetchingNextPage;

  const loadMoreConversations = useCallback(function (): void {
    if (!listQuery.hasNextPage || listQuery.isFetchingNextPage) {
      return;
    }
    void listQuery.fetchNextPage();
  }, [listQuery]);

  useEffect(
    function () {
      if (listSearch.trim() || !listQuery.hasNextPage) {
        return;
      }
      const container = listScrollRef.current;
      const sentinel = listLoadMoreRef.current;
      if (!container || !sentinel) {
        return;
      }
      const observer = new IntersectionObserver(
        function (entries) {
          const entry = entries[0];
          if (!entry || !entry.isIntersecting) {
            return;
          }
          loadMoreConversations();
        },
        {
          root: container,
          rootMargin: "0px 0px 180px 0px",
          threshold: 0,
        }
      );
      observer.observe(sentinel);
      return function () {
        observer.disconnect();
      };
    },
    [listQuery.hasNextPage, listQuery.isFetchingNextPage, listSearch, loadMoreConversations]
  );

  const handleRowMenuAction = useCallback(
    function (chat: ChatPreview, action: FloatingChatRowMenuAction): void {
      if (action === "delete") {
        setDeleteChat(chat);
        return;
      }
      setArchivedMutation.mutate(
        { chatId: chat.id, archived: action === "archive" },
        {
          onSuccess: function () {
            if (selectedId === chat.id) {
              setSelectedId(null);
            }
          },
        }
      );
    },
    [selectedId, setArchivedMutation]
  );

  useEffect(
    function () {
      if (!enabled || !open || !selectedId) {
        onActiveChatIdChange?.(null);
        return;
      }
      onActiveChatIdChange?.(selectedId);
      return function () {
        onActiveChatIdChange?.(null);
      };
    },
    [enabled, onActiveChatIdChange, open, selectedId]
  );

  useEffect(
    function () {
      if (!enabled) {
        setOpen(false);
        setSelectedId(null);
        setComposeOpen(false);
        setComposeSearch("");
        setListSearch("");
        setListFilter("active");
      }
    },
    [enabled]
  );

  useEffect(function () {
    const intervalId = window.setInterval(function () {
      setPresenceNow(Date.now());
    }, 60_000);
    return function () {
      window.clearInterval(intervalId);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  if (!open) {
    return (
      <FloatingChatPill
        chats={visibleChats}
        unreadCount={unreadCount}
        onOpen={function () {
          setOpen(true);
          setComposeOpen(false);
        }}
      />
    );
  }

  const fullChatHref = selectedId ? ROUTES.CHAT_WITH(selectedId) : ROUTES.CHAT;
  const showingThread = Boolean(selectedId) && !composeOpen;

  return (
    <section
      className="fixed bottom-5 right-5 z-40 hidden h-[min(512px,calc(100dvh-5rem))] w-[372px] overflow-hidden rounded-[20px] border border-black/[0.08] bg-bg shadow-[0_18px_64px_rgba(0,0,0,0.22)] md:flex md:flex-col"
      data-floating-chat-panel
      aria-label="Floating messages"
    >
      <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-border bg-bg/95 px-3 backdrop-blur-xl">
        {showingThread ? (
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={function () {
                setSelectedId(null);
                setComposeOpen(false);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg hover:bg-hover"
              aria-label="Back to messages"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            </button>
            {selectedChat?.username ? (
              <Link
                href={ROUTES.PROFILE(selectedChat.username.replace(/^@/, ""))}
                className="flex min-w-0 items-center gap-2 rounded-xl py-1 pr-2 hover:bg-hover"
              >
                <span className="relative shrink-0">
                  <Avatar
                    initial={(selectedChat?.name ?? "M").charAt(0)}
                    src={selectedChat?.avatarUrl}
                    className="h-9 w-9 text-[12px] shadow-sm"
                    loading="eager"
                  />
                  {selectedPresenceTargetIds.length > 0 ? (
                    <ChatPresenceDot
                      availability={selectedPresenceSummary.availability}
                      className="absolute -bottom-0.5 -right-0.5"
                    />
                  ) : null}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-bold text-fg">
                    {selectedChat?.name ?? "Messages"}
                  </h2>
                  <p className="truncate text-[12px] text-fg-muted">
                    {selectedPresenceSummary.label}
                  </p>
                </div>
              </Link>
            ) : (
              <>
                <span className="relative shrink-0">
                  <Avatar
                    initial={(selectedChat?.name ?? "M").charAt(0)}
                    src={selectedChat?.avatarUrl}
                    className="h-9 w-9 text-[12px] shadow-sm"
                    loading="eager"
                  />
                  {selectedPresenceTargetIds.length > 0 ? (
                    <ChatPresenceDot
                      availability={selectedPresenceSummary.availability}
                      className="absolute -bottom-0.5 -right-0.5"
                    />
                  ) : null}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-bold text-fg">
                    {selectedChat?.name ?? "Messages"}
                  </h2>
                  <p className="truncate text-[12px] text-fg-muted">
                    {selectedPresenceSummary.label}
                  </p>
                </div>
              </>
            )}
          </div>
        ) : composeOpen ? (
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={function () {
                setComposeOpen(false);
                setComposeSearch("");
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg hover:bg-hover"
              aria-label="Back to messages"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            </button>
            <h2 className="truncate text-[18px] font-bold text-fg">
              New message
            </h2>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[18px] font-bold text-fg">
              Messages
            </h2>
            {unreadCount > 0 ? (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ff3045] px-1.5 text-[12px] font-bold text-white tabular-nums">
                {formatUnread(unreadCount)}
              </span>
            ) : null}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {!showingThread && !composeOpen ? (
            <button
              type="button"
              onClick={function () {
                setSelectedId(null);
                setComposeOpen(true);
                setComposeSearch("");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-fg hover:bg-hover"
              aria-label="New message"
            >
              <PenLine className="h-4 w-4" strokeWidth={2.3} />
            </button>
          ) : null}
          {showingThread || !composeOpen ? (
            <Link
              href={fullChatHref}
              className="flex h-9 w-9 items-center justify-center rounded-full text-fg hover:bg-hover"
              aria-label="Open full messages page"
            >
              <Maximize2 className="h-4 w-4" strokeWidth={2.3} />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={function () {
              setOpen(false);
              setSelectedId(null);
              setComposeOpen(false);
              setComposeSearch("");
              setListSearch("");
              setListFilter("active");
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-fg hover:bg-hover"
            aria-label="Close messages"
          >
            <X className="h-6 w-6" strokeWidth={2} />
          </button>
        </div>
      </header>

      {composeOpen ? (
        <div className="flex min-h-0 flex-1 flex-col bg-bg">
          <div className="border-b border-border px-3 py-3">
            <input
              type="search"
              value={composeSearch}
              onChange={function (event) {
                setComposeSearch(event.target.value);
              }}
              placeholder="Search by name or @username"
              className="w-full rounded-xl border border-border bg-sunken px-3 py-2 text-[14px] text-fg outline-none placeholder:text-fg-muted focus-visible:ring-2 focus-visible:ring-[#007AFF]/25"
              aria-label="Search people"
              disabled={createConversationMutation.isPending}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {createConversationMutation.isError ? (
              <p className="px-3 py-2 text-[13px] text-red-600 dark:text-red-400" role="alert">
                Could not start this conversation. Try again.
              </p>
            ) : null}
            {contactsQuery.isLoading ? (
              <div className="px-3 py-8 text-center text-[13px] text-fg-muted">
                Loading people...
              </div>
            ) : contactsQuery.isError ? (
              <div className="px-3 py-8 text-center">
                <p className="mb-3 text-[13px] text-fg-muted">
                  Could not load your connections.
                </p>
                <button
                  type="button"
                  onClick={function () {
                    contactsQuery.refetch();
                  }}
                  className="text-[13px] font-semibold text-[#007AFF]"
                >
                  Try again
                </button>
              </div>
            ) : contactsQuery.candidates.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[14px] font-semibold text-fg">
                  {composeSearch.trim() ? "No matches found" : "No connections yet"}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                  {composeSearch.trim()
                    ? "Try a different name or username."
                    : "Follow filmmakers to message them here."}
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5" role="listbox" aria-label="People you can message">
                {contactsQuery.candidates.map(function (contact) {
                  return (
                    <li key={contact.userId}>
                      <button
                        type="button"
                        role="option"
                        disabled={createConversationMutation.isPending}
                        onClick={function () {
                          createConversationMutation.mutate(
                            {
                              type: "dm",
                              memberIds: [contact.userId],
                              member: {
                                username: contact.username,
                                displayName: contact.displayName,
                              },
                            },
                            {
                              onSuccess: function (thread) {
                                setSelectedId(thread.id);
                                setComposeOpen(false);
                                setComposeSearch("");
                              },
                            }
                          );
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-hover disabled:opacity-60"
                      >
                        <Avatar
                          initial={(contact.displayName || contact.username).charAt(0)}
                          src={contact.avatarUrl}
                          className="h-9 w-9 shrink-0 text-[12px] shadow-sm"
                          loading="lazy"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-fg">
                            {contact.displayName}
                          </span>
                          <span className="block truncate text-[12px] text-fg-muted">
                            @{contact.username}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : selectedId ? (
        <div className="min-h-0 flex-1">
          <ChatConversation
            chatId={selectedId}
            chatName={selectedChat?.name ?? null}
            chatUsername={selectedChat?.username ?? null}
            chatAvatarUrl={selectedChat?.avatarUrl}
            avatarBg={selectedChat?.avatarBg}
            avatarColor={selectedChat?.avatarColor}
            conversationLoading={selectedChatLoading}
            hideHeader
            compact
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col bg-bg">
          <div className="px-3 py-3">
            <input
              type="search"
              value={listSearch}
              onChange={function (event) {
                setListSearch(event.target.value);
              }}
              placeholder="Search messages"
              className="w-full rounded-full border border-border/70 bg-sunken px-4 py-2.5 text-[14px] text-fg outline-none placeholder:text-fg-muted focus-visible:ring-2 focus-visible:ring-[#007AFF]/25"
              aria-label="Search chats"
            />
            <div
              className="mt-2 flex rounded-full bg-sunken p-1"
              role="tablist"
              aria-label="Floating chat folder"
            >
              <button
                type="button"
                role="tab"
                aria-selected={listFilter === "active"}
                onClick={function () {
                  setListFilter("active");
                }}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  listFilter === "active"
                    ? "bg-elevated text-fg shadow-sm"
                    : "text-fg-muted hover:text-fg"
                )}
              >
                Inbox
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={listFilter === "archived"}
                onClick={function () {
                  setListFilter("archived");
                }}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  listFilter === "archived"
                    ? "bg-elevated text-fg shadow-sm"
                    : "text-fg-muted hover:text-fg"
                )}
              >
                Archived
              </button>
            </div>
          </div>
          <div
            ref={listScrollRef}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            {listQuery.isLoading ? (
              <div className="space-y-1 px-3 py-3" aria-hidden>
                {[0, 1, 2, 3, 4].map(function (item) {
                  return (
                    <div key={item} className="flex animate-pulse items-center gap-3 py-3">
                      <div className="h-10 w-10 rounded-full bg-border/80" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-2/3 rounded bg-border/80" />
                        <div className="h-3.5 w-5/6 rounded bg-border/60" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : listQuery.isError ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="text-[14px] text-fg-muted">Couldn&apos;t load messages.</p>
                <button
                  type="button"
                  onClick={function () {
                    listQuery.refetch();
                    requestsQuery.refetch();
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-[13px] font-semibold text-bg"
                >
                  <RefreshCw className="h-4 w-4" strokeWidth={2} />
                  Retry
                </button>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <MessageCircle className="mb-4 h-12 w-12 text-fg-muted/50" strokeWidth={1.7} />
                <p className="text-[15px] font-semibold text-fg">
                  {listSearch.trim()
                    ? "No matches."
                    : listFilter === "archived"
                      ? "No archived chats."
                      : "No messages yet."}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                  {listSearch.trim()
                    ? "Try another name, username, or message."
                    : listFilter === "archived"
                      ? "Archived conversations appear here."
                      : "Conversations appear here when people message you."}
                </p>
                {!listSearch.trim() && listFilter === "active" ? (
                  <button
                    type="button"
                    onClick={function () {
                      setComposeOpen(true);
                      setComposeSearch("");
                    }}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-[13px] font-semibold text-bg"
                  >
                    <PenLine className="h-4 w-4" strokeWidth={2} />
                    New message
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="py-2">
                {filteredChats.map(function (chat) {
                  const targetIds = getChatPresenceTargetIds(
                    chat.members,
                    currentUserId
                  );
                  const showPresence = targetIds.some(function (userId) {
                    return presenceUserIds.includes(userId);
                  });
                  const presenceSummary = summarizeChatPresence(
                    targetIds,
                    presence.data,
                    presenceNow
                  );
                  return (
                    <FloatingChatListRow
                      key={chat.id}
                      chat={chat}
                      presenceSummary={presenceSummary}
                      showPresence={showPresence}
                      selected={selectedId === chat.id}
                      onSelect={function () {
                        setSelectedId(chat.id);
                      }}
                      onMenuAction={handleRowMenuAction}
                      actionDisabled={rowActionDisabled}
                    />
                  );
                })}
                <div ref={listLoadMoreRef} />
                {canLoadMoreConversations ? (
                  <div className="px-3 py-3">
                    <button
                      type="button"
                      onClick={loadMoreConversations}
                      disabled={isLoadingMoreConversations}
                      className="w-full rounded-full border border-border bg-bg px-3 py-2 text-[12px] font-semibold text-fg disabled:opacity-60"
                    >
                      {isLoadingMoreConversations
                        ? "Loading older conversations..."
                        : "Load older conversations"}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(deleteChat)}
        onClose={function () {
          if (!deleteConversationMutation.isPending) {
            setDeleteChat(null);
          }
        }}
        onConfirm={function () {
          if (!deleteChat) {
            return;
          }
          const chatId = deleteChat.id;
          deleteConversationMutation.mutate(chatId, {
            onSuccess: function () {
              if (selectedId === chatId) {
                setSelectedId(null);
              }
              setDeleteChat(null);
            },
          });
        }}
        title={deleteChat ? "Delete chat with " + deleteChat.name + "?" : "Delete chat?"}
        description="This can't be undone. All messages in this conversation will be removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        swapButtonOrder
      />
    </section>
  );
}
