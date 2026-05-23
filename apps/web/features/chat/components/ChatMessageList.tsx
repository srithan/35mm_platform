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
import { BodyPortal } from "@/components/BodyPortal/BodyPortal";
import { usePopoverLayer } from "@/lib/hooks/usePopoverLayer";
import type { ChatMessage } from "../types";
import {
  formatDaySeparator,
  formatMessageTime,
  shouldShowDaySeparator,
} from "../lib/formatChatTime";
import { ChatEmojiPanel } from "./ChatEmojiPanel";

const TOP_5_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

const BUBBLE_MORE_MENU_MIN_WIDTH_PX = 148;
const BUBBLE_MORE_MENU_Z = 280;

type ReactionPhase = "closed" | "bar" | "picker";

interface ChatMessageListProps {
  messages: ChatMessage[];
  otherAvatar: { bg: string; color: string; initial: string };
  onReply: (msg: ChatMessage) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReportMessage?: (messageId: string) => void;
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
                  ? "bg-[#007AFF]/35"
                  : "bg-sunken"
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
  onDelete,
  onReport,
}: {
  align: "left" | "right";
  isOwn: boolean;
  onReply: () => void;
  onToggleReaction: (emoji: string) => void;
  onCopy: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}) {
  const [reactionPhase, setReactionPhase] = useState<ReactionPhase>("closed");
  const [showMore, setShowMore] = useState(false);
  const [moreMenuPos, setMoreMenuPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const reactionClusterRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const updateMoreMenuPosition = useCallback(function (): void {
    const btn = moreBtnRef.current;
    const menu = moreMenuRef.current;
    if (!btn || !menu) {
      return;
    }
    const br = btn.getBoundingClientRect();
    const mr = menu.getBoundingClientRect();
    const mw = Math.max(BUBBLE_MORE_MENU_MIN_WIDTH_PX, mr.width);
    const mh = mr.height;
    const gap = 4;
    const margin = 8;
    let top = br.top - mh - gap;
    if (top < margin) {
      top = br.bottom + gap;
    }
    let left =
      align === "right" ? br.right - mw : br.left;
    const maxLeft = window.innerWidth - mw - margin;
    left = Math.max(margin, Math.min(left, maxLeft));
    setMoreMenuPos({ top: top, left: left });
  }, [align]);

  const closeOverlays = useCallback(function (): void {
    setReactionPhase("closed");
    setShowMore(false);
  }, []);

  const dismissMoreMenuOnly = useCallback(function (): void {
    setShowMore(false);
  }, []);

  const isInsideMessageActions = useCallback(function (t: Node): boolean {
    return !!(
      moreMenuRef.current?.contains(t) || ref.current?.contains(t)
    );
  }, []);

  usePopoverLayer({
    open: reactionPhase !== "closed" || showMore,
    reposition: updateMoreMenuPosition,
    isInside: isInsideMessageActions,
    onPointerOutsideDismiss: closeOverlays,
    onEscape: showMore ? dismissMoreMenuOnly : undefined,
  });

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
        "flex items-center gap-0.5 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity",
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
              "absolute bottom-full mb-2 z-[75] flex items-center gap-0.5 rounded-full border border-border bg-elevated px-1.5 py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
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
                  className="w-9 h-9 rounded-full text-[20px] leading-none flex items-center justify-center hover:bg-hover transition-colors"
                >
                  {emoji}
                </button>
              );
            })}
            <button
              ref={plusRef}
              type="button"
              onClick={function () {
                setReactionPhase(function (p) {
                  return p === "picker" ? "bar" : "picker";
                });
              }}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                reactionPhase === "picker"
                  ? "bg-[#007AFF]/15 text-[#007AFF]"
                  : "text-fg-muted hover:bg-hover"
              )}
              aria-label="More emoji"
            >
              <Icon name="plus" className="w-[18px] h-[18px]" strokeWidth={2.25} />
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
          ref={moreBtnRef}
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
          <BodyPortal>
            <div
              ref={moreMenuRef}
              role="menu"
              className="fixed min-w-[148px] py-1 rounded-xl border border-border bg-elevated text-fg shadow-xl"
              style={{
                top: moreMenuPos.top,
                left: moreMenuPos.left,
                zIndex: BUBBLE_MORE_MENU_Z,
                boxShadow:
                  "0 12px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-[12px] text-fg hover:bg-hover"
                onClick={function () {
                  onCopy();
                  setShowMore(false);
                }}
              >
                Copy
              </button>
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
          </BodyPortal>
        ) : null}
      </div>
    </div>
  );
}

function ReactionChips({
  msg,
  isOwn,
  onToggleReaction,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  onToggleReaction: (messageId: string, emoji: string) => void;
}) {
  const list = (msg.reactions || []).filter(function (r) {
    return r.count > 0;
  });
  if (list.length === 0) {
    return null;
  }
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 w-full max-w-[min(100%,520px)]",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      {list.map(function (r) {
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={function () {
              onToggleReaction(msg.id, r.emoji);
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] border transition-colors",
              r.includesMe
                ? "bg-[#007AFF]/12 border-[#007AFF]/35 dark:bg-[#007AFF]/20"
                : "bg-sunken border-border"
            )}
          >
            <span>{r.emoji}</span>
            {r.count > 1 ? (
              <span className="text-[10px] font-semibold tabular-nums text-fg-muted">
                {r.count}
              </span>
            ) : null}
          </button>
        );
      })}
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
  onDeleteMessage,
  onReportMessage,
  onJumpToMessage,
}: {
  msg: ChatMessage;
  otherAvatar: { bg: string; color: string; initial: string };
  showAvatar: boolean;
  isFirstInRun: boolean;
  isLastInRun: boolean;
  receiptLabel: "read" | "delivered" | null;
  isJumpHighlighted: boolean;
  onReply: (msg: ChatMessage) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReportMessage?: (messageId: string) => void;
  onJumpToMessage: (messageId: string) => void;
}) {
  const time = formatMessageTime(msg.createdAt);

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

  function copyText(): void {
    const parts: string[] = [];
    if (msg.text) {
      parts.push(msg.text);
    }
    const t = parts.join("\n").trim();
    if (t && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(t).catch(function () {});
    }
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
          "flex min-w-0 max-w-full group items-end gap-2 w-fit",
          msg.isOwn ? "justify-end" : "justify-start",
          !msg.isOwn && !showAvatar && "pl-10"
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
          <div
            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-[11px] shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
            style={{ background: otherAvatar.bg, color: otherAvatar.color }}
          >
            {otherAvatar.initial}
          </div>
        ) : null}
        {!msg.isOwn && !showAvatar ? (
          <div className="w-7 flex-shrink-0" aria-hidden />
        ) : null}
        <div
          className={cn(
            "max-w-[min(100%,520px)] min-w-0 overflow-hidden transition-shadow duration-300",
            bubbleRadius,
            "shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)]",
            msg.isOwn
              ? "bg-gradient-to-br from-[#0A84FF] to-[#0070E0] text-white"
              : "bg-sunken text-fg border border-border",
            isJumpHighlighted &&
              (msg.isOwn
                ? "ring-2 ring-white/70 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_4px_20px_rgba(10,132,255,0.35)]"
                : "ring-2 ring-[#007AFF]/55 shadow-[0_0_0_1px_rgba(10,132,255,0.2),0_4px_18px_rgba(10,132,255,0.12)]")
          )}
        >
          <div
            className={cn(
              "px-3.5 py-2",
              msg.media || msg.file ? "pb-2" : ""
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
                  msg.isOwn
                    ? "border-white/45 bg-white/10 hover:bg-white/[0.14]"
                    : "border-[#007AFF]/50 bg-border/25 hover:bg-border/40"
                )}
                aria-label="Jump to quoted message"
              >
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wide",
                    msg.isOwn ? "text-white/75" : "text-[#007AFF]"
                  )}
                >
                  {msg.replyTo.isOwn ? "You" : "Them"}
                </p>
                <p
                  className={cn(
                    "text-[12px] leading-snug line-clamp-2 mt-0.5",
                    msg.isOwn ? "text-white/85" : "text-fg-muted"
                  )}
                >
                  {msg.replyTo.snippet}
                </p>
              </button>
            ) : null}
            {msg.media ? (
              <div className="mb-1.5 rounded-[14px] overflow-hidden ring-1 ring-black/10 dark:ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={msg.media.url}
                  alt=""
                  className="max-w-[min(100%,280px)] max-h-[220px] w-full object-cover bg-black/10"
                  loading="lazy"
                />
              </div>
            ) : null}
            {msg.file && !msg.media ? (
              <div
                className={cn(
                  "flex items-center gap-2 mb-1.5 rounded-xl px-2.5 py-2",
                  msg.isOwn ? "bg-white/15" : "bg-border/35"
                )}
              >
                <Icon
                  name="paperclip"
                  className={cn(
                    "w-4 h-4 shrink-0",
                    msg.isOwn ? "text-white/90" : "text-fg-muted"
                  )}
                  strokeWidth={2}
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[13px] font-medium truncate",
                      msg.isOwn ? "text-white" : "text-fg"
                    )}
                  >
                    {msg.file.name}
                  </p>
                  {msg.file.sizeLabel ? (
                    <p
                      className={cn(
                        "text-[11px]",
                        msg.isOwn ? "text-white/65" : "text-fg-muted"
                      )}
                    >
                      {msg.file.sizeLabel}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {msg.text ? (
              <p
                className={cn(
                  "text-[16px] md:text-[15px] leading-[1.42] tracking-[0.01em] whitespace-pre-wrap break-words",
                  msg.isOwn ? "text-white" : "text-fg"
                )}
              >
                {msg.text}
              </p>
            ) : null}
            <div
              className={cn(
                "flex items-center justify-end gap-1.5 mt-1",
                msg.isOwn ? "text-white/55" : "text-fg-muted/90"
              )}
            >
              <span className="text-[10px] tabular-nums">{time}</span>
              {msg.isOwn && msg.status === "sending" ? (
                <span className="text-[10px]">Sending…</span>
              ) : null}
            </div>
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
      <div
        className={cn(
          "max-w-[min(100%,520px)]",
          msg.isOwn ? "self-end" : "self-start pl-10"
        )}
      >
        <ReactionChips
          msg={msg}
          isOwn={msg.isOwn}
          onToggleReaction={onToggleReaction}
        />
      </div>
      {receiptLabel ? (
        <div className="flex justify-end pr-1">
          <span className="text-[10px] text-fg-muted/70 tabular-nums">
            {receiptLabel === "read" ? "Read" : "Delivered"}
          </span>
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
  onDeleteMessage,
  onReportMessage,
  stickToBottomRef,
  scrollRootRef,
}: ChatMessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(
    null
  );
  const highlightClearRef = useRef<number | null>(null);

  const lastOwnId = useMemo(
    function () {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].isOwn) {
          return messages[i].id;
        }
      }
      return null;
    },
    [messages]
  );

  const scrollAnchorRef = useRef<{
    lastMessageId: string | null;
    count: number;
  } | null>(null);

  useEffect(
    function () {
      const count = messages.length;
      const lastMessageId =
        count > 0 ? messages[count - 1].id : null;
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
    [messages, stickToBottomRef]
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
      {messages.map(function (msg, index) {
        const prev = messages[index - 1];
        const next = messages[index + 1];
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
          if (msg.status === "read") {
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
                onDeleteMessage={onDeleteMessage}
                onReportMessage={onReportMessage}
                onJumpToMessage={jumpToMessage}
              />
            </div>
          </div>
        );
      })}
      <div ref={endRef} className="h-px shrink-0" aria-hidden />
    </div>
  );
}
