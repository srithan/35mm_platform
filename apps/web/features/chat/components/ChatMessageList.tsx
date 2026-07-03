"use client";

import {
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  type CSSProperties,
  type MouseEvent,
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
import typingStyles from "./ChatTypingIndicator.module.css";

const TOP_5_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];
const KEYCAP_EMOJI_PATTERN = /[0-9#*]\uFE0F?\u20E3/gu;
const EMOJI_COMPONENT_PATTERN =
  /[\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0E\uFE0F\u200D\u20E3]/gu;

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
  compact?: boolean;
}

function isStandaloneEmojiText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  return trimmed
    .replace(KEYCAP_EMOJI_PATTERN, "")
    .replace(EMOJI_COMPONENT_PATTERN, "")
    .replace(/\s/g, "").length === 0;
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
  compact,
  onReply,
  onToggleReaction,
  onCopy,
  onEdit,
  onDelete,
  onReport,
}: {
  align: "left" | "right";
  isOwn: boolean;
  compact: boolean;
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
  const [compactQuickBarStyle, setCompactQuickBarStyle] =
    useState<CSSProperties | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);
  const reactionClusterRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const closeOverlays = useCallback(function (): void {
    setReactionPhase("closed");
    setShowMore(false);
    setCompactQuickBarStyle(undefined);
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
    setCompactQuickBarStyle(undefined);
  }

  function getCompactQuickBarStyle(anchor: HTMLElement): CSSProperties | undefined {
    const panel = anchor.closest("[data-floating-chat-panel]");
    if (!(panel instanceof HTMLElement)) {
      return undefined;
    }
    const panelRect = panel.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const horizontalInset = 12;
    const barHeight = 48;
    return {
      left: panelRect.left + horizontalInset,
      top: Math.max(panelRect.top + 8, anchorRect.top - barHeight),
      width: Math.max(0, panelRect.width - horizontalInset * 2),
    };
  }

  function toggleReactionBar(event: MouseEvent<HTMLButtonElement>): void {
    const nextPhase = reactionPhase === "closed" ? "bar" : "closed";
    setReactionPhase(nextPhase);
    setShowMore(false);
    if (!compact || nextPhase === "closed") {
      setCompactQuickBarStyle(undefined);
      return;
    }
    setCompactQuickBarStyle(getCompactQuickBarStyle(event.currentTarget));
  }

  function pickQuick(emoji: string): void {
    onToggleReaction(emoji);
    setReactionPhase("closed");
    setCompactQuickBarStyle(undefined);
  }

  const isReactionBarOpen = reactionPhase !== "closed";

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-0.5 shrink-0 transition-opacity",
        showMore || isReactionBarOpen
          ? "opacity-100"
          : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
        align === "left" && "order-first"
      )}
    >
      <div className="relative" ref={reactionClusterRef}>
        <button
          type="button"
          onClick={toggleReactionBar}
          className={cn(
            "rounded-full p-1.5 transition-colors",
            !compact && "md:hidden",
            isReactionBarOpen
              ? "text-[#007AFF] bg-[#007AFF]/12 dark:bg-[#007AFF]/20"
              : "text-fg-muted hover:text-fg hover:bg-hover"
          )}
          aria-label="React"
          aria-expanded={isReactionBarOpen}
        >
          <Icon name="smile" className="w-4 h-4" strokeWidth={2} />
        </button>
        {!showMore ? (
          <div
            className={cn(
              "z-[75] items-center gap-0.5 rounded-full border border-border/80 bg-elevated/95 px-1 py-1 shadow-[0_6px_28px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.04)] backdrop-blur-xl",
              compact
                ? "fixed justify-center"
                : "absolute bottom-full mb-2.5",
              isReactionBarOpen && (!compact || compactQuickBarStyle)
                ? "flex"
                : compact
                  ? "hidden"
                  : "hidden md:group-hover:flex md:group-focus-within:flex",
              reactionStyles.quickBar,
              !compact && (align === "left" ? "right-0" : "left-0")
            )}
            style={compact ? compactQuickBarStyle : undefined}
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
            {!compact ? (
              <>
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
              </>
            ) : null}
          </div>
        ) : null}
        {!compact ? (
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
        ) : null}
      </div>
      <button
        type="button"
        onClick={function () {
          closeReactions();
          onReply();
        }}
        className="hidden rounded-full p-1.5 text-fg-muted transition-colors hover:bg-hover hover:text-fg md:inline-flex"
        aria-label="Reply"
      >
        <Icon name="reply" className="w-4 h-4" strokeWidth={2} />
      </button>
      <div className="relative hidden md:block">
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
    <span className={typingStyles.bubble} aria-hidden>
      {[0, 1, 2].map(function (dot) {
        return (
          <span
            key={dot}
            className={typingStyles.dot}
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
        <div className="w-fit text-fg-muted">
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
  compact,
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
  compact: boolean;
}) {
  const time = formatMessageTime(msg.createdAt);
  const hasAttachment = Boolean(msg.media || msg.file);
  const trimmedText = msg.text.trim();
  const isStandaloneEmoji =
    !hasAttachment && !msg.replyTo && isStandaloneEmojiText(trimmedText);
  const isStandaloneMedia =
    Boolean(msg.media) && !msg.file && !msg.replyTo && trimmedText.length === 0;
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
        "rounded-[24px]",
        isFirstInRun && isLastInRun && "rounded-br-[14px]",
        isFirstInRun && !isLastInRun && "rounded-br-[14px]",
        !isFirstInRun && isLastInRun && "rounded-tr-[14px] rounded-br-[14px]",
        !isFirstInRun && !isLastInRun && "rounded-r-[14px]"
      )
    : cn(
        "rounded-[24px]",
        isFirstInRun && isLastInRun && "rounded-bl-[14px]",
        isFirstInRun && !isLastInRun && "rounded-bl-[14px]",
        !isFirstInRun && isLastInRun && "rounded-tl-[14px] rounded-bl-[14px]",
        !isFirstInRun && !isLastInRun && "rounded-l-[14px]"
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
            compact={compact}
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
            isStandaloneEmoji
              ? cn(
                  compact ? "max-w-[min(100%,10rem)]" : "max-w-[min(100%,18rem)]",
                  "overflow-visible"
                )
              : hasAttachment
              ? cn(
                  compact ? "max-w-[min(100%,240px)]" : "max-w-[min(100%,340px)]",
                  "overflow-visible"
                )
              : cn(
                  compact
                    ? "max-w-[min(100%,230px)] overflow-visible"
                    : "max-w-[min(100%,520px)] overflow-visible",
                  bubbleRadius,
                  "shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)]",
                  msg.isOwn
                    ? "bg-gradient-to-br from-[#0A84FF] to-[#0070E0] text-white"
                    : "bg-sunken text-fg border border-border dark:bg-[color-mix(in_srgb,var(--elevated)_88%,var(--fg)_12%)] dark:border-white/[0.08]"
                ),
            isJumpHighlighted &&
              (isStandaloneEmoji || isStandaloneMedia
                ? "rounded-[18px] ring-2 ring-[#007AFF]/50"
                : hasAttachment
                ? "rounded-[16px] ring-2 ring-[#007AFF]/50"
                : msg.isOwn
                  ? "ring-2 ring-white/70 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_4px_20px_rgba(10,132,255,0.35)]"
                  : "ring-2 ring-[#007AFF]/55 shadow-[0_0_0_1px_rgba(10,132,255,0.2),0_4px_18px_rgba(10,132,255,0.12)]")
          )}
        >
          <ChatMessageReactions
            reactions={msg.reactions}
            isOwn={msg.isOwn}
            compact={compact}
            onToggle={function (emoji) {
              onToggleReaction(msg.id, emoji);
            }}
          />
          <div
            className={cn(
              hasAttachment
                ? "p-0"
                : isStandaloneEmoji
                  ? "px-0.5 py-0"
                  : "px-3.5 py-2",
              showReactions && !hasAttachment && !isStandaloneEmoji && "pt-4",
              showReactions && isStandaloneEmoji && "pt-3"
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
                className="block w-fit max-w-full overflow-hidden rounded-[14px] bg-black/[0.03] ring-1 ring-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/60 dark:bg-white/[0.04] dark:ring-white/10"
                aria-label="View image"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={msg.media.url}
                  alt=""
                  className={cn(
                    "block h-auto object-contain",
                    compact
                      ? "max-h-[220px] max-w-[min(100%,230px)]"
                      : "max-h-[320px] max-w-[min(70vw,320px)]"
                  )}
                  loading="lazy"
                />
              </button>
            ) : null}
            {msg.file && !msg.media ? (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-[14px] border border-border bg-elevated px-3 py-2.5 text-fg shadow-[0_2px_10px_rgba(0,0,0,0.06)]",
                  compact ? "max-w-[min(100%,230px)]" : "max-w-[min(70vw,320px)]"
                )}
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
                  "whitespace-pre-wrap break-words",
                  isStandaloneEmoji
                    ? cn(
                        "select-text leading-none tracking-normal [text-shadow:0_1px_3px_rgba(0,0,0,0.10)]",
                        compact ? "text-[32px]" : "text-[40px] md:text-[38px]"
                      )
                    : "text-[16px] leading-[1.42] tracking-[0.01em] md:text-[15px]",
                  isStandaloneEmoji
                    ? "text-fg"
                    : hasAttachment
                    ? cn(
                        "mt-1.5 w-fit rounded-[22px] px-3.5 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)]",
                        compact ? "max-w-[min(100%,230px)]" : "max-w-[min(70vw,320px)]",
                        msg.isOwn
                          ? "ml-auto rounded-br-[14px] bg-gradient-to-br from-[#0A84FF] to-[#0070E0] text-white"
                          : "rounded-bl-[14px] border border-border bg-sunken text-fg dark:bg-[color-mix(in_srgb,var(--elevated)_88%,var(--fg)_12%)] dark:border-white/[0.08]"
                      )
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
                      msg.isOwn && !isStandaloneEmoji ? "text-white/55" : "text-fg-muted"
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
            compact={compact}
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
  compact = false,
}: ChatMessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const initialPinUntilRef = useRef(0);
  const scheduledScrollTimeoutsRef = useRef<number[]>([]);
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

  const scrollToBottom = useCallback(
    function (behavior: ScrollBehavior = "auto"): void {
      const root = scrollRootRef.current;
      if (!root) {
        endRef.current?.scrollIntoView({ behavior: behavior, block: "end" });
        return;
      }
      const maxTop = Math.max(0, root.scrollHeight - root.clientHeight);
      if (behavior === "auto") {
        root.scrollTop = maxTop;
        return;
      }
      root.scrollTo({ top: maxTop, behavior: behavior });
    },
    [scrollRootRef]
  );

  const clearScheduledScrolls = useCallback(function (): void {
    scheduledScrollTimeoutsRef.current.forEach(function (id) {
      window.clearTimeout(id);
    });
    scheduledScrollTimeoutsRef.current = [];
  }, []);

  const scheduleScrollToBottom = useCallback(
    function (): void {
      clearScheduledScrolls();
      scrollToBottom("auto");
      requestAnimationFrame(function () {
        scrollToBottom("auto");
        requestAnimationFrame(function () {
          scrollToBottom("auto");
        });
      });
      [80, 180, 360].forEach(function (delay) {
        const id = window.setTimeout(function () {
          scrollToBottom("auto");
        }, delay);
        scheduledScrollTimeoutsRef.current.push(id);
      });
    },
    [clearScheduledScrolls, scrollToBottom]
  );

  useLayoutEffect(
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
        initialPinUntilRef.current = performance.now() + 1200;
        stickToBottomRef.current = true;
        scheduleScrollToBottom();
        return;
      }
      const appendedOrReplacedLast =
        lastMessageId !== prev.lastMessageId || count > prev.count;
      if (appendedOrReplacedLast && stickToBottomRef.current) {
        scheduleScrollToBottom();
      }
    },
    [scheduleScrollToBottom, sortedMessages, stickToBottomRef, typingUsers.length]
  );

  useEffect(
    function () {
      if (typingUsers.length > 0 && stickToBottomRef.current) {
        scheduleScrollToBottom();
      }
    },
    [scheduleScrollToBottom, stickToBottomRef, typingUsers.length]
  );

  useEffect(
    function () {
      const list = listRef.current;
      const root = scrollRootRef.current;
      if (!list || typeof ResizeObserver === "undefined") {
        return;
      }
      const observer = new ResizeObserver(function () {
        if (
          stickToBottomRef.current ||
          performance.now() <= initialPinUntilRef.current
        ) {
          scrollToBottom("auto");
        }
      });
      observer.observe(list);
      if (root) {
        observer.observe(root);
      }
      return function () {
        observer.disconnect();
      };
    },
    [scrollRootRef, scrollToBottom, stickToBottomRef]
  );

  useEffect(
    function () {
      return function () {
        clearScheduledScrolls();
        if (highlightClearRef.current) {
          window.clearTimeout(highlightClearRef.current);
        }
      };
    },
    [clearScheduledScrolls]
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
    <div
      ref={listRef}
      className={cn(
        "max-w-full overflow-x-hidden space-y-2 py-4 md:py-5",
        compact ? "px-2" : "px-3 md:px-4"
      )}
    >
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
                "flex w-fit min-w-0 flex-col gap-1 scroll-mt-[calc(3rem+max(0.5rem,env(safe-area-inset-top,0px))+0.5rem)] md:scroll-mt-8",
                compact ? "max-w-full" : "max-w-[min(100%,520px)]",
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
                compact={compact}
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
