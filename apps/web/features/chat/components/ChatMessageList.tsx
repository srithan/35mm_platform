"use client";

import {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
  type MutableRefObject,
} from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/Icon/Icon";
import { Avatar } from "@/components/Avatar";
import { ImageViewer } from "@/components/ImageViewer/ImageViewer";
import { usePopoverLayer } from "@/lib/hooks/usePopoverLayer";
import type { ChatMessage } from "../types";
import type {
  ChatReadReceiptState,
  ChatTypingUser,
} from "../realtime/state";
import {
  formatDaySeparator,
  formatMessageTime,
  shouldShowDaySeparator,
} from "../lib/formatChatTime";
import { sortChatMessages } from "../lib/sortChatMessages";
import { ChatEmojiPanel } from "./ChatEmojiPanel";
import {
  ChatMessageReactions,
  hasVisibleReactions,
} from "./ChatMessageReactions";
import reactionStyles from "./ChatReactions.module.css";

const TOP_5_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

type ReactionPhase = "closed" | "bar" | "picker";

interface ChatMessageListProps {
  messages: ChatMessage[];
  otherAvatar: { bg: string; color: string; initial: string; src?: string | null };
  onReply: (msg: ChatMessage) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onEditMessage?: (msg: ChatMessage) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReportMessage?: (messageId: string) => void;
  typingUsers?: ChatTypingUser[];
  readReceipt?: ChatReadReceiptState | null;
  /** When false, new messages do not auto-scroll (user is reading history). */
  stickToBottomRef: MutableRefObject<boolean>;
  scrollRootRef: MutableRefObject<HTMLDivElement | null>;
}

export function ChatMessagesSkeleton() {
  return (
    <div className="space-y-3 px-4 py-6 animate-pulse" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map(function (i) {
        return (
          <div
            key={i}
            className={cn("flex", i % 3 === 0 ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "h-11 rounded-[18px]",
                i % 3 === 0
                  ? "w-[min(62%,22rem)] bg-[#007AFF]/35"
                  : i % 3 === 1
                    ? "w-[min(74%,26rem)] bg-sunken"
                    : "w-[min(48%,18rem)] bg-sunken"
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

function MessageActions({
  align,
  isOwn,
  onReply,
  onToggleReaction,
  onCopy,
  onEdit,
  onDelete,
  onReport,
}: {
  align: "left" | "right";
  isOwn: boolean;
  onReply: () => void;
  onToggleReaction: (emoji: string) => void;
  onCopy: () => boolean | Promise<boolean>;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}) {
  const [reactionPhase, setReactionPhase] = useState<ReactionPhase>("closed");
  const [showMore, setShowMore] = useState(false);
  const [copyLabel, setCopyLabel] = useState<"Copy" | "Copied">("Copy");
  const ref = useRef<HTMLDivElement>(null);
  const reactionClusterRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const closeOverlays = useCallback(function (): void {
    setReactionPhase("closed");
    setShowMore(false);
  }, []);

  const dismissMoreMenuOnly = useCallback(function (): void {
    setShowMore(false);
  }, []);

  const isInsideMessageActions = useCallback(function (t: Node): boolean {
    const targetElement = t instanceof Element ? t : null;
    return !!(
      moreMenuRef.current?.contains(t) ||
      ref.current?.contains(t) ||
      targetElement?.closest("[data-chat-emoji-panel]")
    );
  }, []);
  const noopReposition = useCallback(function (): void {}, []);

  usePopoverLayer({
    open: reactionPhase !== "closed" || showMore,
    reposition: noopReposition,
    isInside: isInsideMessageActions,
    onPointerOutsideDismiss: closeOverlays,
    onEscape: showMore ? dismissMoreMenuOnly : undefined,
  });

  useEffect(
    function () {
      if (!showMore) {
        setCopyLabel("Copy");
      }
    },
    [showMore]
  );

  function closeReactions(): void {
    setReactionPhase("closed");
  }

  function pickQuick(emoji: string): void {
    onToggleReaction(emoji);
    setReactionPhase("closed");
  }

  const showReactionBar = reactionPhase !== "closed";

  return (
    <div
      ref={ref}
      className={cn(
        "hidden md:flex items-center gap-0.5 shrink-0 transition-opacity",
        showMore || showReactionBar ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        align === "left" && "order-first"
      )}
    >
      <div className="relative" ref={reactionClusterRef}>
        <button
          type="button"
          onClick={function () {
            setReactionPhase(function (p) {
              return p === "closed" ? "bar" : "closed";
            });
            setShowMore(false);
          }}
          className={cn(
            "p-1.5 rounded-full transition-colors",
            showReactionBar
              ? "text-[#007AFF] bg-[#007AFF]/12 dark:bg-[#007AFF]/20"
              : "text-fg-muted hover:text-fg hover:bg-hover"
          )}
          aria-label="React"
          aria-expanded={showReactionBar}
        >
          <Icon name="smile" className="w-4 h-4" strokeWidth={2} />
        </button>
        {showReactionBar ? (
          <div
            className={cn(
              "absolute bottom-full mb-2.5 z-[75] flex items-center gap-0.5 rounded-full border border-border/80 bg-elevated/95 px-1 py-1 shadow-[0_6px_28px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.04)] backdrop-blur-xl",
              reactionStyles.quickBar,
              align === "left" ? "right-0" : "left-0"
            )}
            role="toolbar"
            aria-label="Quick reactions"
          >
            {TOP_5_REACTIONS.map(function (emoji) {
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={function () {
                    pickQuick(emoji);
                  }}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-[22px] leading-none",
                    reactionStyles.quickEmoji
                  )}
                >
                  {emoji}
                </button>
              );
            })}
            <span
              className="mx-0.5 h-5 w-px shrink-0 bg-border/70"
              aria-hidden
            />
            <button
              ref={plusRef}
              type="button"
              onClick={function () {
                setReactionPhase(function (p) {
                  return p === "picker" ? "bar" : "picker";
                });
              }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border border-dashed transition-colors",
                reactionPhase === "picker"
                  ? "border-[#007AFF]/45 bg-[#007AFF]/12 text-[#007AFF]"
                  : "border-border/80 text-fg-muted hover:border-[#007AFF]/35 hover:bg-hover hover:text-fg"
              )}
              aria-label="More emoji"
            >
              <Icon name="plus" className="h-[17px] w-[17px]" strokeWidth={2.25} />
            </button>
          </div>
        ) : null}
        <ChatEmojiPanel
          isOpen={reactionPhase === "picker"}
          onClose={function () {
            setReactionPhase(function (p) {
              return p === "picker" ? "bar" : p;
            });
          }}
          onPick={function (emoji) {
            onToggleReaction(emoji);
            setReactionPhase("closed");
          }}
          anchorRef={plusRef}
          variant="bubble"
          align={align === "right" ? "right" : "left"}
          pickerOnly
          dismissInsideRef={reactionClusterRef}
        />
      </div>
      <button
        type="button"
        onClick={function () {
          closeReactions();
          onReply();
        }}
        className="p-1.5 text-fg-muted hover:text-fg hover:bg-hover rounded-full transition-colors"
        aria-label="Reply"
      >
        <Icon name="reply" className="w-4 h-4" strokeWidth={2} />
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={function () {
            setShowMore(function (s) {
              return !s;
            });
            setReactionPhase("closed");
          }}
          className="p-1.5 text-fg-muted hover:text-fg hover:bg-hover rounded-full transition-colors"
          aria-label="More"
          aria-expanded={showMore}
          aria-haspopup="menu"
        >
          <Icon name="more-horizontal" className="w-4 h-4" strokeWidth={2} />
        </button>
        {showMore ? (
          <div
            ref={moreMenuRef}
            role="menu"
            className={cn(
              "absolute top-1/2 z-[85] min-w-[150px] -translate-y-1/2 rounded-xl border border-border bg-elevated py-1 text-fg shadow-[0_12px_40px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.08)]",
              align === "left" ? "right-full mr-2" : "left-full ml-2"
            )}
          >
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2 text-left text-[12px] text-fg hover:bg-hover"
              onClick={async function () {
                const ok = await onCopy();
                if (ok) {
                  setCopyLabel("Copied");
                  window.setTimeout(function () {
                    setShowMore(false);
                  }, 650);
                }
              }}
            >
              {copyLabel}
            </button>
            {isOwn && onEdit ? (
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-[12px] text-fg hover:bg-hover"
                onClick={function () {
                  onEdit();
                  setShowMore(false);
                }}
              >
                Edit message
              </button>
            ) : null}
            {!isOwn && onReport ? (
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-[12px] text-fg hover:bg-hover"
                onClick={function () {
                  onReport();
                  setShowMore(false);
                }}
              >
                Report
              </button>
            ) : null}
            {isOwn && onDelete ? (
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-[12px] text-red-600 dark:text-red-400 hover:bg-red-500/10"
                onClick={function () {
                  onDelete();
                  setShowMore(false);
                }}
              >
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 px-1" aria-hidden>
      {[0, 1, 2].map(function (dot) {
        return (
          <span
            key={dot}
            className="h-1.5 w-1.5 rounded-full bg-fg-muted/70 animate-pulse"
            style={{ animationDelay: String(dot * 120) + "ms" }}
          />
        );
      })}
    </span>
  );
}

function TypingIndicator({
  users,
  otherAvatar,
}: {
  users: ChatTypingUser[];
  otherAvatar: { bg: string; color: string; initial: string; src?: string | null };
}) {
  if (users.length === 0) {
    return null;
  }
  const first = users[0];
  const label =
    users.length === 1
      ? (first.username ? first.username.replace(/^@/, "") : "They") + " is typing"
      : String(users.length) + " people are typing";
  return (
    <div className="flex items-end gap-2 pl-0.5 pt-1" role="status" aria-live="polite">
      <Avatar
        initial={(first.username || otherAvatar.initial || "?").charAt(0)}
        src={first.avatarUrl ?? otherAvatar.src}
        className="h-7 w-7 text-[11px] shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
        loading="lazy"
      />
      <div className="flex flex-col gap-1">
        <div className="w-fit rounded-[18px] rounded-bl-[5px] border border-border bg-sunken px-3.5 py-2.5 text-fg shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <TypingDots />
        </div>
        <span className="pl-1 text-[10px] text-fg-muted/80">{label}</span>
      </div>
    </div>
  );
}

function BubbleRow({
  msg,
  otherAvatar,
  showAvatar,
  isFirstInRun,
  isLastInRun,
  receiptLabel,
  isJumpHighlighted,
  onReply,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onReportMessage,
  onJumpToMessage,
  onOpenImage,
}: {
  msg: ChatMessage;
  otherAvatar: { bg: string; color: string; initial: string; src?: string | null };
  showAvatar: boolean;
  isFirstInRun: boolean;
  isLastInRun: boolean;
  receiptLabel: "read" | "delivered" | null;
  isJumpHighlighted: boolean;
  onReply: (msg: ChatMessage) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onEditMessage?: (msg: ChatMessage) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReportMessage?: (messageId: string) => void;
  onJumpToMessage: (messageId: string) => void;
  onOpenImage: (url: string) => void;
}) {
  const time = formatMessageTime(msg.createdAt);
  const hasAttachment = Boolean(msg.media || msg.file);
  const showReactions = hasVisibleReactions(msg.reactions);
  const statusLabel =
    receiptLabel === "read"
      ? "Read"
      : receiptLabel === "delivered"
        ? "Delivered"
        : msg.isOwn && msg.status === "sending"
          ? "Sending..."
          : null;

  const bubbleRadius = msg.isOwn
    ? cn(
        "rounded-[20px]",
        isFirstInRun && isLastInRun && "rounded-br-[5px]",
        isFirstInRun && !isLastInRun && "rounded-br-[4px]",
        !isFirstInRun && isLastInRun && "rounded-tr-[20px] rounded-br-[5px]",
        !isFirstInRun && !isLastInRun && "rounded-[5px]"
      )
    : cn(
        "rounded-[20px]",
        isFirstInRun && isLastInRun && "rounded-bl-[5px]",
        isFirstInRun && !isLastInRun && "rounded-bl-[4px]",
        !isFirstInRun && isLastInRun && "rounded-tl-[20px] rounded-bl-[5px]",
        !isFirstInRun && !isLastInRun && "rounded-[5px]"
      );

  async function copyText(): Promise<boolean> {
    const parts: string[] = [];
    if (msg.text) {
      parts.push(msg.text);
    }
    const t = parts.join("\n").trim();
    if (t && typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(t);
        return true;
      } catch (_err) {
        return false;
      }
    }
    return false;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        msg.isOwn ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn(
          "relative flex min-w-0 max-w-full group items-end gap-2 w-fit",
          msg.isOwn ? "justify-end" : "justify-start",
          showReactions && "mt-2"
        )}
      >
        {msg.isOwn ? (
          <MessageActions
            align="left"
            isOwn={msg.isOwn}
            onReply={function () {
              onReply(msg);
            }}
            onToggleReaction={function (emoji) {
              onToggleReaction(msg.id, emoji);
            }}
            onCopy={copyText}
            onEdit={
              onEditMessage && msg.text.trim()
                ? function () {
                    onEditMessage(msg);
                  }
                : undefined
            }
            onDelete={
              onDeleteMessage
                ? function () {
                    onDeleteMessage(msg.id);
                  }
                : undefined
            }
            onReport={undefined}
          />
        ) : null}
        {!msg.isOwn && showAvatar ? (
          <Avatar
            initial={otherAvatar.initial}
            src={msg.senderAvatarUrl ?? otherAvatar.src}
            className="w-7 h-7 text-[11px] shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
            loading="lazy"
          />
        ) : null}
        {!msg.isOwn && !showAvatar ? (
          <div className="w-7 flex-shrink-0" aria-hidden />
        ) : null}
        <div
          className={cn(
            "relative min-w-0 transition-shadow duration-300",
            hasAttachment
              ? "max-w-[min(100%,340px)] overflow-visible"
              : cn(
                  "max-w-[min(100%,520px)] overflow-visible",
                  bubbleRadius,
                  "shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)]",
                  msg.isOwn
                    ? "bg-gradient-to-br from-[#0A84FF] to-[#0070E0] text-white"
                    : "bg-sunken text-fg border border-border"
                ),
            isJumpHighlighted &&
              (hasAttachment
                ? "rounded-[16px] ring-2 ring-[#007AFF]/50"
                : msg.isOwn
                  ? "ring-2 ring-white/70 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_4px_20px_rgba(10,132,255,0.35)]"
                  : "ring-2 ring-[#007AFF]/55 shadow-[0_0_0_1px_rgba(10,132,255,0.2),0_4px_18px_rgba(10,132,255,0.12)]")
          )}
        >
          <ChatMessageReactions
            reactions={msg.reactions}
            isOwn={msg.isOwn}
            onToggle={function (emoji) {
              onToggleReaction(msg.id, emoji);
            }}
          />
          <div
            className={cn(
              hasAttachment ? "p-0" : "px-3.5 py-2",
              showReactions && !hasAttachment && "pt-4"
            )}
          >
            {msg.replyTo ? (
              <button
                type="button"
                onClick={function (e) {
                  e.preventDefault();
                  onJumpToMessage(msg.replyTo!.id);
                  e.currentTarget.blur();
                }}
                className={cn(
                  "mb-2 block w-full text-left pl-2.5 border-l-[3px] rounded-lg py-1.5 -mx-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#007AFF]/45",
                  hasAttachment
                    ? "border-[#007AFF]/50 bg-elevated text-fg hover:bg-hover"
                    : msg.isOwn
                    ? "border-white/45 bg-white/10 hover:bg-white/[0.14]"
                    : "border-[#007AFF]/50 bg-border/25 hover:bg-border/40"
                )}
                aria-label="Jump to quoted message"
              >
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wide",
                    hasAttachment || !msg.isOwn ? "text-[#007AFF]" : "text-white/75"
                  )}
                >
                  {msg.replyTo.isOwn ? "You" : "Them"}
                </p>
                <p
                  className={cn(
                    "text-[12px] leading-snug line-clamp-2 mt-0.5",
                    hasAttachment || !msg.isOwn ? "text-fg-muted" : "text-white/85"
                  )}
                >
                  {msg.replyTo.snippet}
                </p>
              </button>
            ) : null}
            {msg.media ? (
              <button
                type="button"
                onClick={function () {
                  onOpenImage(msg.media!.url);
                }}
                className="block w-fit overflow-hidden rounded-[14px] bg-black/[0.03] ring-1 ring-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 dark:bg-white/[0.04] dark:ring-white/10"
                aria-label="View image"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={msg.media.url}
                  alt=""
                  className="block h-auto max-h-[320px] max-w-[min(70vw,320px)] object-contain"
                  loading="lazy"
                />
              </button>
            ) : null}
            {msg.file && !msg.media ? (
              <div
                className="flex max-w-[min(70vw,320px)] items-center gap-2 rounded-[14px] border border-border bg-elevated px-3 py-2.5 text-fg shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
              >
                <Icon
                  name="paperclip"
                  className="w-4 h-4 shrink-0 text-fg-muted"
                  strokeWidth={2}
                />
                <div className="min-w-0">
                  <p
                    className="truncate text-[13px] font-medium text-fg"
                  >
                    {msg.file.name}
                  </p>
                  {msg.file.sizeLabel ? (
                    <p className="text-[11px] text-fg-muted">
                      {msg.file.sizeLabel}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {msg.text ? (
              <p
                className={cn(
                  "whitespace-pre-wrap break-words text-[16px] leading-[1.42] tracking-[0.01em] md:text-[15px]",
                  hasAttachment
                    ? "mt-1.5 px-0.5 text-fg"
                    : msg.isOwn
                      ? "text-white"
                      : "text-fg"
                )}
              >
                {msg.text}
                {msg.editedAt ? (
                  <span
                    className={cn(
                      "ml-1 text-[11px]",
                      hasAttachment || !msg.isOwn ? "text-fg-muted" : "text-white/55"
                    )}
                  >
                    edited
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
        {!msg.isOwn ? (
          <MessageActions
            align="right"
            isOwn={msg.isOwn}
            onReply={function () {
              onReply(msg);
            }}
            onToggleReaction={function (emoji) {
              onToggleReaction(msg.id, emoji);
            }}
            onCopy={copyText}
            onEdit={undefined}
            onDelete={undefined}
            onReport={
              onReportMessage
                ? function () {
                    onReportMessage(msg.id);
                  }
                : undefined
            }
          />
        ) : null}
      </div>
      {isLastInRun ? (
        <div
          className={cn(
            "flex items-center gap-1.5 px-1 text-[10px] text-fg-muted/70",
            msg.isOwn ? "justify-end self-end" : "justify-start self-start pl-9"
          )}
        >
          <span className="tabular-nums">{time}</span>
          {statusLabel ? (
            <>
              <span aria-hidden>&middot;</span>
              <span>{statusLabel}</span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ChatMessageList({
  messages,
  otherAvatar,
  onReply,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onReportMessage,
  typingUsers = [],
  readReceipt = null,
  stickToBottomRef,
  scrollRootRef,
}: ChatMessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(
    null
  );
  const highlightClearRef = useRef<number | null>(null);

  const sortedMessages = useMemo(
    function () {
      return sortChatMessages(messages);
    },
    [messages]
  );

  const lastOwnId = useMemo(
    function () {
      for (let i = sortedMessages.length - 1; i >= 0; i--) {
        if (sortedMessages[i].isOwn) {
          return sortedMessages[i].id;
        }
      }
      return null;
    },
    [sortedMessages]
  );

  const readReceiptIndex = useMemo(
    function () {
      if (!readReceipt) {
        return -1;
      }
      return sortedMessages.findIndex(function (message) {
        return message.id === readReceipt.messageId;
      });
    },
    [readReceipt, sortedMessages]
  );

  const scrollAnchorRef = useRef<{
    lastMessageId: string | null;
    count: number;
  } | null>(null);

  useEffect(
    function () {
      const count = sortedMessages.length;
      const lastMessageId =
        count > 0 ? sortedMessages[count - 1].id : null;
      const prev = scrollAnchorRef.current;
      scrollAnchorRef.current = {
        lastMessageId: lastMessageId,
        count: count,
      };
      if (prev === null) {
        endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
        return;
      }
      const appendedOrReplacedLast =
        lastMessageId !== prev.lastMessageId || count > prev.count;
      if (appendedOrReplacedLast && stickToBottomRef.current) {
        endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      }
    },
    [sortedMessages, stickToBottomRef, typingUsers.length]
  );

  useEffect(
    function () {
      if (typingUsers.length > 0 && stickToBottomRef.current) {
        endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      }
    },
    [stickToBottomRef, typingUsers.length]
  );

  useEffect(
    function () {
      return function () {
        if (highlightClearRef.current) {
          window.clearTimeout(highlightClearRef.current);
        }
      };
    },
    []
  );

  function scrollMessageIntoViewCentered(el: HTMLElement, root: HTMLDivElement): void {
    const cs = getComputedStyle(root);
    const padTop = parseFloat(cs.scrollPaddingTop) || 0;
    const padBottom = parseFloat(cs.scrollPaddingBottom) || 0;
    const elRect = el.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const elTopInRoot =
      elRect.top - rootRect.top + root.scrollTop;
    const elH = elRect.height;
    const viewH = root.clientHeight;
    const innerH = Math.max(0, viewH - padTop - padBottom);
    if (innerH <= 0) {
      return;
    }
    const idealTop = elTopInRoot - padTop - innerH / 2 + elH / 2;
    const maxScroll = Math.max(0, root.scrollHeight - viewH);
    const nextTop = Math.min(maxScroll, Math.max(0, idealTop));
    root.scrollTo({
      top: nextTop,
      behavior: "smooth",
    });
  }

  function jumpToMessage(messageId: string): void {
    setHighlightedMessageId(messageId);
    if (highlightClearRef.current) {
      window.clearTimeout(highlightClearRef.current);
    }
    highlightClearRef.current = window.setTimeout(function () {
      setHighlightedMessageId(null);
    }, 2200);

    function runScroll(): void {
      const el = document.getElementById("chat-message-" + messageId);
      if (!el) {
        return;
      }
      const root = scrollRootRef.current;
      if (root) {
        scrollMessageIntoViewCentered(el, root);
      } else {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(runScroll);
    });
  }

  return (
    <div className="space-y-2 px-3 md:px-4 py-4 md:py-5">
      {sortedMessages.map(function (msg, index) {
        const prev = sortedMessages[index - 1];
        const next = sortedMessages[index + 1];
        const dayBreakAfterPrev =
          prev != null &&
          shouldShowDaySeparator(prev.createdAt, msg.createdAt);
        const dayBreakBeforeNext =
          next != null &&
          shouldShowDaySeparator(msg.createdAt, next.createdAt);
        const isFirstInRun =
          !prev || prev.isOwn !== msg.isOwn || dayBreakAfterPrev;
        const isLastInRun =
          !next || next.isOwn !== msg.isOwn || dayBreakBeforeNext;
        const showAvatar = !msg.isOwn && isFirstInRun;
        let receiptLabel: "read" | "delivered" | null = null;
        if (msg.isOwn && msg.id === lastOwnId && isLastInRun) {
          if (readReceiptIndex >= index || msg.status === "read") {
            receiptLabel = "read";
          } else if (msg.status === "delivered") {
            receiptLabel = "delivered";
          }
        }

        return (
          <div key={msg.id} className="flex w-full flex-col">
            {shouldShowDaySeparator(
              prev ? prev.createdAt : null,
              msg.createdAt
            ) ? (
              <div className="flex justify-center my-5 w-full">
                <span className="text-[11px] font-medium text-fg-muted/90 bg-sunken border border-border px-3 py-1 rounded-full tracking-wide">
                  {formatDaySeparator(msg.createdAt)}
                </span>
              </div>
            ) : null}
            <div
              id={"chat-message-" + msg.id}
              className={cn(
                "flex w-fit max-w-[min(100%,520px)] min-w-0 flex-col gap-1 scroll-mt-[calc(3rem+max(0.5rem,env(safe-area-inset-top,0px))+0.5rem)] md:scroll-mt-8",
                msg.isOwn ? "self-end" : "self-start"
              )}
            >
              <BubbleRow
                msg={msg}
                otherAvatar={otherAvatar}
                showAvatar={showAvatar}
                isFirstInRun={isFirstInRun}
                isLastInRun={isLastInRun}
                receiptLabel={receiptLabel}
                isJumpHighlighted={highlightedMessageId === msg.id}
                onReply={onReply}
                onToggleReaction={onToggleReaction}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
                onReportMessage={onReportMessage}
                onJumpToMessage={jumpToMessage}
                onOpenImage={setViewerSrc}
              />
            </div>
          </div>
        );
      })}
      <TypingIndicator users={typingUsers} otherAvatar={otherAvatar} />
      <div ref={endRef} className="h-px shrink-0" aria-hidden />
      <ImageViewer
        open={viewerSrc != null}
        onClose={function () {
          setViewerSrc(null);
        }}
        src={viewerSrc ?? undefined}
        alt="Chat image"
      />
    </div>
  );
}
