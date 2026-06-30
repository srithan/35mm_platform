"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useChatInputFocus } from "@/components/layout/ChatInputFocusContext";
import { Icon } from "@/components/Icon/Icon";
import { Avatar } from "@/components/Avatar";
import { ROUTES } from "@/lib/constants/routes";
import {
  useChatMessages,
  useConversationRow,
  useSendMessage,
  useMarkConversationRead,
  useSetConversationArchived,
  useToggleReaction,
  useEditMessage,
  useDeleteMessage,
  useDeleteConversation,
} from "../hooks/useChatQueries";
import type { ChatMessage } from "../types";
import { ChatMessageList, ChatMessagesSkeleton } from "./ChatMessageList";
import { ChatComposer } from "./ChatComposer";
import {
  ChatHeaderMoreMenu,
  type ChatHeaderMenuAction,
} from "./ChatHeaderMoreMenu";
import { ChatSearchInput } from "./ChatSearchInput";
import { ChatJumpToLatestFab } from "./ChatJumpToLatestFab";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useNewChat } from "../context/NewChatContext";
import { getChatErrorMessage } from "../api/errors";

interface ChatConversationProps {
  chatId: string | null;
  chatName: string | null;
  chatUsername?: string | null;
  chatAvatarUrl?: string | null;
  avatarBg?: string;
  avatarColor?: string;
  conversationLoading?: boolean;
  hideHeader?: boolean;
  fixedInputOnMobile?: boolean;
  /** In-thread message search (e.g. from mobile header). Omit to use internal state on desktop. */
  threadSearchQuery?: string;
  onThreadSearchQueryChange?: (query: string) => void;
}

export function ChatConversation({
  chatId,
  chatName,
  chatUsername,
  chatAvatarUrl,
  avatarBg = "#2a1e30",
  avatarColor = "#9a7ab0",
  conversationLoading = false,
  hideHeader = false,
  fixedInputOnMobile = false,
  threadSearchQuery: threadSearchQueryProp,
  onThreadSearchQueryChange,
}: ChatConversationProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { setChatInputFocused } = useChatInputFocus();
  const { data: messages = [], isLoading, isError, refetch } = useChatMessages(chatId);
  const { row: conversationRow } = useConversationRow(chatId);
  const sendMutation = useSendMessage();
  const toggleReactionMutation = useToggleReaction();
  const editMutation = useEditMessage();
  const deleteMutation = useDeleteMessage();
  const setArchivedMutation = useSetConversationArchived();
  const deleteConversationMutation = useDeleteConversation();
  const { mutate: markConversationRead } = useMarkConversationRead();
  const { openNewChat } = useNewChat();

  const conversationArchived = Boolean(conversationRow?.archived);

  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [headerToast, setHeaderToast] = useState<string | null>(null);
  const [internalThreadSearch, setInternalThreadSearch] = useState("");
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [deleteConvoDialogOpen, setDeleteConvoDialogOpen] = useState(false);

  const threadSearchControlled =
    threadSearchQueryProp !== undefined && onThreadSearchQueryChange !== undefined;
  const threadSearchQuery = threadSearchControlled
    ? threadSearchQueryProp
    : internalThreadSearch;
  const setThreadSearchQuery = threadSearchControlled
    ? onThreadSearchQueryChange
    : setInternalThreadSearch;

  const displayedMessages = useMemo(
    function () {
      const q = threadSearchQuery.trim().toLowerCase();
      if (!q) {
        return messages;
      }
      return messages.filter(function (m) {
        if (m.text && m.text.toLowerCase().indexOf(q) !== -1) {
          return true;
        }
        if (m.file && m.file.name.toLowerCase().indexOf(q) !== -1) {
          return true;
        }
        if (
          m.replyTo &&
          m.replyTo.snippet.toLowerCase().indexOf(q) !== -1
        ) {
          return true;
        }
        if (m.media) {
          if (q === "gif" && m.media.type === "gif") {
            return true;
          }
          if (
            (q === "photo" || q === "image" || q === "picture") &&
            m.media.type === "image"
          ) {
            return true;
          }
        }
        return false;
      });
    },
    [messages, threadSearchQuery]
  );

  const scrollRootRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const scrollAwayAnchorIdRef = useRef<string | null>(null);
  const displayedMessagesRef = useRef(displayedMessages);
  displayedMessagesRef.current = displayedMessages;

  const [jumpFabVisible, setJumpFabVisible] = useState(false);
  const [newBelowCount, setNewBelowCount] = useState(0);

  const handleMessagesScroll = useCallback(function () {
    const el = scrollRootRef.current;
    if (!el) {
      return;
    }
    const threshold = 72;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = dist <= threshold;
    const wasAtBottom = stickToBottomRef.current;
    stickToBottomRef.current = atBottom;
    if (atBottom) {
      scrollAwayAnchorIdRef.current = null;
      setNewBelowCount(0);
      setJumpFabVisible(false);
    } else {
      if (wasAtBottom && !atBottom) {
        const list = displayedMessagesRef.current;
        if (list.length > 0) {
          scrollAwayAnchorIdRef.current = list[list.length - 1].id;
        }
      }
      setJumpFabVisible(true);
    }
  }, []);

  useEffect(
    function () {
      if (stickToBottomRef.current) {
        setNewBelowCount(0);
        return;
      }
      const anchorId = scrollAwayAnchorIdRef.current;
      if (!anchorId) {
        setNewBelowCount(0);
        return;
      }
      const idx = displayedMessages.findIndex(function (m) {
        return m.id === anchorId;
      });
      if (idx === -1) {
        setNewBelowCount(displayedMessages.length);
        return;
      }
      setNewBelowCount(Math.max(0, displayedMessages.length - 1 - idx));
    },
    [displayedMessages]
  );

  useEffect(
    function () {
      stickToBottomRef.current = true;
      scrollAwayAnchorIdRef.current = null;
      setJumpFabVisible(false);
      setNewBelowCount(0);
    },
    [chatId]
  );

  useEffect(
    function () {
      if (isLoading || isError || !chatId) {
        return;
      }
      requestAnimationFrame(function () {
        handleMessagesScroll();
      });
    },
    [isLoading, isError, chatId, messages.length, handleMessagesScroll]
  );

  const scrollToLatest = useCallback(function () {
    const el = scrollRootRef.current;
    if (!el) {
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    stickToBottomRef.current = true;
    scrollAwayAnchorIdRef.current = null;
    setNewBelowCount(0);
    setJumpFabVisible(false);
  }, []);

  const flashHeaderToast = useCallback(function (text: string): void {
    setHeaderToast(text);
    window.setTimeout(function () {
      setHeaderToast(null);
    }, 2400);
  }, []);

  const handleChatHeaderAction = useCallback(
    function (action: ChatHeaderMenuAction) {
      if (action === "delete") {
        setDeleteConvoDialogOpen(true);
        return;
      }
      if (action === "archive") {
        if (!chatId) {
          return;
        }
        setArchivedMutation.mutate(
          { chatId: chatId, archived: true },
          {
            onSuccess: function () {
              flashHeaderToast("Chat archived.");
              if (pathname.toLowerCase() === ROUTES.CHAT_WITH(chatId).toLowerCase()) {
                router.push(ROUTES.CHAT);
              }
            },
          }
        );
        return;
      }
      if (action === "unarchive") {
        if (!chatId) {
          return;
        }
        setArchivedMutation.mutate(
          { chatId: chatId, archived: false },
          {
            onSuccess: function () {
              flashHeaderToast("Chat moved to inbox.");
            },
          }
        );
        return;
      }
      if (action === "report") {
        flashHeaderToast("Thanks — we’ll review this chat.");
        return;
      }
      flashHeaderToast("Thanks — we’ll review this chat.");
    },
    [chatId, flashHeaderToast, pathname, router, setArchivedMutation]
  );

  useEffect(
    function () {
      if (!fixedInputOnMobile) {
        return;
      }
      return function () {
        setChatInputFocused(false);
      };
    },
    [fixedInputOnMobile, setChatInputFocused]
  );

  useEffect(
    function () {
      if (!chatId || messages.length === 0) {
        return;
      }
      const lastMessage = messages[messages.length - 1];
      markConversationRead({
        chatId: chatId,
        lastReadMessageId: lastMessage.id,
      });
    },
    [chatId, markConversationRead, messages]
  );

  useEffect(
    function () {
      setReplyingTo(null);
      setEditingMessage(null);
    },
    [chatId]
  );

  useEffect(
    function () {
      if (!threadSearchControlled) {
        setInternalThreadSearch("");
        setThreadSearchOpen(false);
      }
    },
    [chatId, threadSearchControlled]
  );

  const handleReply = useCallback(function (msg: ChatMessage) {
    setEditingMessage(null);
    setReplyingTo(msg);
  }, []);

  const handleEditMessage = useCallback(function (msg: ChatMessage) {
    setReplyingTo(null);
    setEditingMessage(msg);
  }, []);

  const handleToggleReaction = useCallback(
    function (messageId: string, emoji: string) {
      if (!chatId) {
        return;
      }
      toggleReactionMutation.mutate({
        chatId: chatId,
        messageId: messageId,
        emoji: emoji,
      });
    },
    [chatId, toggleReactionMutation]
  );

  const handleDelete = useCallback(
    function (messageId: string) {
      if (!chatId) {
        return;
      }
      deleteMutation.mutate(
        { chatId: chatId, messageId: messageId },
        {
          onSuccess: function () {
            if (editingMessage?.id === messageId) {
              setEditingMessage(null);
            }
            if (replyingTo?.id === messageId) {
              setReplyingTo(null);
            }
            flashHeaderToast("Message deleted.");
          },
          onError: function (error) {
            flashHeaderToast(getChatErrorMessage(error));
          },
        }
      );
    },
    [chatId, deleteMutation, editingMessage?.id, flashHeaderToast, replyingTo?.id]
  );

  const handleReportMessage = useCallback(
    function (_messageId: string) {
      flashHeaderToast("Thanks — we’ll review this message.");
    },
    [flashHeaderToast]
  );

  if (!chatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-center px-8 bg-bg">
        <div className="w-[72px] h-[72px] rounded-full bg-elevated flex items-center justify-center mb-5 shadow-sm border border-border">
          <Icon name="chat" className="w-9 h-9 text-[#007AFF]" strokeWidth={1.5} />
        </div>
        <p className="text-[17px] font-semibold text-fg tracking-[-0.02em]">
          Messages
        </p>
        <p className="text-[13px] text-fg-muted mt-1.5 max-w-[240px] leading-relaxed">
          Select a conversation or start a new message with someone you follow.
        </p>
        <div className="mt-5">
          <button
            type="button"
            onClick={openNewChat}
            className="inline-flex items-center justify-center rounded-full bg-[#007AFF] px-5 py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
          >
            New message
          </button>
        </div>
      </div>
    );
  }

  const displayName = chatName || "Conversation";
  const handle = chatUsername ? "@" + chatUsername.replace(/^@/, "") : null;
  const otherAvatar = {
    bg: avatarBg,
    color: avatarColor,
    initial: displayName.charAt(0),
    src: chatAvatarUrl ?? conversationRow?.avatarUrl ?? null,
  };

  const replyBanner =
    replyingTo &&
    ({
      id: replyingTo.id,
      snippet: (function () {
        let s = replyingTo.text.trim();
        if (!s) {
          if (replyingTo.media && replyingTo.media.type === "gif") {
            s = "GIF";
          } else if (replyingTo.media && replyingTo.media.type === "image") {
            s = "Photo";
          } else if (replyingTo.file) {
            s = replyingTo.file.name;
          } else {
            s = "Message";
          }
        }
        return s.length > 100 ? s.slice(0, 99) + "…" : s;
      })(),
      isOwn: replyingTo.isOwn,
    } as const);

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg">
      {!hideHeader ? (
        <header className="shrink-0 border-b border-black/[0.06] dark:border-white/[0.08] bg-bg/95 backdrop-blur-md select-none">
          {conversationLoading && !conversationRow ? (
            <div className="flex items-center justify-between gap-2 px-2 sm:px-3 py-2.5 animate-pulse" aria-hidden>
              <div className="flex items-center gap-3 px-2 py-1.5">
                <div className="h-10 w-10 rounded-full bg-border/80" />
                <div className="space-y-2">
                  <div className="h-3.5 w-32 rounded bg-border/80" />
                  <div className="h-3 w-20 rounded bg-border/60" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-border/60" />
                <div className="h-9 w-9 rounded-xl bg-border/60" />
              </div>
            </div>
          ) : (
          <div className="flex items-center justify-between gap-2 px-2 sm:px-3 py-2.5">
            {chatUsername ? (
              <Link
                href={ROUTES.PROFILE(chatUsername.replace(/^@/, ""))}
                className="flex w-fit min-w-0 max-w-[min(18rem,calc(100%-3.5rem))] items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-black/[0.045] dark:hover:bg-white/[0.06] active:scale-[0.99] transition-[transform,background-color] duration-150"
              >
                <Avatar
                  initial={displayName.charAt(0)}
                  src={otherAvatar.src}
                  className="w-10 h-10 text-[14px] shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
                  loading="eager"
                />
                <div className="min-w-0 text-left">
                  <h2 className="font-semibold text-[15px] text-fg truncate tracking-[-0.01em]">
                    {displayName}
                  </h2>
                  <p className="text-[12px] text-fg-muted truncate">{handle}</p>
                </div>
              </Link>
            ) : (
              <div className="flex w-fit min-w-0 max-w-[min(18rem,calc(100%-3.5rem))] items-center gap-3 rounded-xl px-2 py-1.5">
                <Avatar
                  initial={displayName.charAt(0)}
                  src={otherAvatar.src}
                  className="w-10 h-10 text-[14px] shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
                  loading="eager"
                />
                <div className="min-w-0 text-left">
                  <h2 className="font-semibold text-[15px] text-fg truncate tracking-[-0.01em]">
                    {displayName}
                  </h2>
                </div>
              </div>
            )}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={function () {
                  setThreadSearchOpen(function (o) {
                    return !o;
                  });
                }}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  threadSearchOpen || threadSearchQuery.trim()
                    ? "text-[#007AFF] bg-[#007AFF]/12 dark:bg-[#007AFF]/20"
                    : "text-fg-muted hover:text-fg hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                )}
                aria-label="Search in conversation"
                aria-expanded={threadSearchOpen}
              >
                <Icon name="search" className="w-5 h-5" strokeWidth={2} />
              </button>
              <ChatHeaderMoreMenu
                onAction={handleChatHeaderAction}
                align="right"
                conversationArchived={conversationArchived}
              />
            </div>
          </div>
          )}
          {!hideHeader &&
          threadSearchOpen &&
          !threadSearchControlled ? (
            <div className="px-2 sm:px-3 pb-2.5">
              <ChatSearchInput
                value={threadSearchQuery}
                onChange={setThreadSearchQuery}
                placeholder="Search in conversation"
                autoFocus
                ariaLabel="Search in conversation"
              />
            </div>
          ) : null}
          {headerToast ? (
            <div
              className="px-4 py-2 text-center text-[12px] font-medium text-[#007AFF] bg-[#007AFF]/[0.08] border-t border-[#007AFF]/15"
              role="status"
            >
              {headerToast}
            </div>
          ) : null}
        </header>
      ) : null}

      {hideHeader && headerToast ? (
        <div
          className="shrink-0 px-4 py-2 text-center text-[12px] font-medium text-[#007AFF] bg-[#007AFF]/[0.08] border-b border-black/[0.06] dark:border-white/[0.08]"
          role="status"
        >
          {headerToast}
        </div>
      ) : null}

      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={scrollRootRef}
          onScroll={handleMessagesScroll}
          className={cn(
            "flex-1 min-h-0 overflow-y-auto bg-bg",
            fixedInputOnMobile &&
              "scroll-pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] pb-4"
          )}
        >
          {isLoading ? (
            <ChatMessagesSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-[14px] text-fg-muted mb-3">
                Couldn&apos;t load messages.
              </p>
              <button
                type="button"
                onClick={function () {
                  refetch();
                }}
                className="text-[13px] font-semibold text-[#007AFF] hover:opacity-80"
              >
                Try again
              </button>
            </div>
          ) : displayedMessages.length === 0 &&
            threadSearchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Icon
                name="search"
                className="w-10 h-10 text-fg-muted/50 mb-3"
                strokeWidth={1.5}
              />
              <p className="text-[14px] text-fg-muted">
                No messages match &ldquo;{threadSearchQuery.trim()}&rdquo;.
              </p>
            </div>
          ) : (
            <ChatMessageList
              messages={displayedMessages}
              otherAvatar={otherAvatar}
              onReply={handleReply}
              onToggleReaction={handleToggleReaction}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDelete}
              onReportMessage={handleReportMessage}
              stickToBottomRef={stickToBottomRef}
              scrollRootRef={scrollRootRef}
            />
          )}
        </div>
        <ChatJumpToLatestFab
          show={
            jumpFabVisible &&
            Boolean(chatId) &&
            !isLoading &&
            !isError &&
            messages.length > 0 &&
            !(
              displayedMessages.length === 0 && threadSearchQuery.trim()
            )
          }
          newMessageCount={newBelowCount}
          onPress={scrollToLatest}
        />
      </div>

      <div
        className={cn(
          "shrink-0 px-3 md:px-4 pt-2 pb-3 md:pb-4 border-t border-black/[0.06] dark:border-white/[0.08] bg-bg/95 backdrop-blur-md",
          fixedInputOnMobile &&
            "md:relative fixed left-0 right-0 md:bottom-auto z-30 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
        )}
        style={
          fixedInputOnMobile
            ? { bottom: 0 }
            : undefined
        }
      >
        <ChatComposer
          editingMessage={
            editingMessage
              ? { id: editingMessage.id, text: editingMessage.text }
              : null
          }
          onCancelEdit={function () {
            setEditingMessage(null);
          }}
          onSaveEdit={function (messageId, body) {
            if (!chatId) {
              return;
            }
            editMutation.mutate(
              { chatId: chatId, messageId: messageId, body: body },
              {
                onSuccess: function () {
                  setEditingMessage(null);
                  flashHeaderToast("Message updated.");
                },
                onError: function (error) {
                  flashHeaderToast(getChatErrorMessage(error));
                },
              }
            );
          }}
          replyingTo={replyBanner || null}
          onCancelReply={function () {
            setReplyingTo(null);
          }}
          onSend={function (payload) {
            stickToBottomRef.current = true;
            sendMutation.mutate(
              {
                chatId: chatId as string,
                text: payload.text,
                replyToId: payload.replyToId,
                gifUrl: payload.gifUrl,
                imageDataUrl: payload.imageDataUrl,
                file: payload.file,
              },
              {
                onSuccess: function () {
                  setReplyingTo(null);
                },
                onError: function (error) {
                  flashHeaderToast(getChatErrorMessage(error));
                },
              }
            );
          }}
          disabled={isLoading || isError}
          isSending={sendMutation.isPending || editMutation.isPending}
          onFocusChange={function (focused) {
            if (fixedInputOnMobile) {
              setChatInputFocused(focused);
            }
          }}
        />
      </div>
      <ConfirmDialog
        open={deleteConvoDialogOpen}
        onClose={function () {
          setDeleteConvoDialogOpen(false);
        }}
        onConfirm={function () {
          if (!chatId) {
            setDeleteConvoDialogOpen(false);
            return;
          }
          deleteConversationMutation.mutate(chatId, {
            onSuccess: function () {
              setDeleteConvoDialogOpen(false);
              flashHeaderToast("Conversation deleted.");
              if (pathname.toLowerCase() === ROUTES.CHAT_WITH(chatId).toLowerCase()) {
                router.push(ROUTES.CHAT);
              }
            },
          });
        }}
        title={
          displayName
            ? "Delete chat with " + displayName + "?"
            : "Delete this conversation?"
        }
        description={
          "This can't be undone. All messages in this conversation will be removed."
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        swapButtonOrder
      />
    </div>
  );
}
