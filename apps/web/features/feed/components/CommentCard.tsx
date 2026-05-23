"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import { PostActions } from "@/components/PostActions/PostActions";
import { PortalDropdown } from "@/components/PortalDropdown/PortalDropdown";
import { CURRENT_USER } from "@/lib/constants/currentUser";
import { cn } from "@/lib/utils/cn";
import { RichPostInline } from "@/lib/utils/richPostText";
import { UserRoleHeadline } from "@/lib/utils/userRoleHeadline";
import { Share2, Flag, MoreHorizontal } from "lucide-react";
import { VideoUrlPreview } from "./VideoUrlPreview";
import { extractVideoPreviews } from "../utils/videoPreviews";

export interface Comment {
  id: string;
  username: string;
  /** Display name (defaults to username) */
  displayName?: string;
  avatarUrl?: string | null;
  avatarInitial: string;
  avatarBg?: string;
  avatarColor?: string;
  role?: string | null;
  roleContext?: string | null;
  filmsLoggedCount?: number | null;
  text: string;
  timestamp: string;
  likeCount: number;
  liked?: boolean;
  replyCount: number;
  replies?: Comment[];
}

interface CommentCardProps {
  comment: Comment;
  depth?: number;
}

export function CommentCard({ comment, depth = 0 }: CommentCardProps) {
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [replyBoxOpen, setReplyBoxOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [truncatedText, setTruncatedText] = useState<string | null>(null);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const threadLevel = Math.min(depth, 6);
  const threadInsetPx = threadLevel * 6;
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const { cleanedText, previews } = extractVideoPreviews(comment.text);

  useLayoutEffect(() => {
    const bodyEl = bodyRef.current;
    const measureEl = measureRef.current;
    if (!bodyEl || !measureEl) return;

    const calculateTruncation = () => {
      const width = bodyEl.getBoundingClientRect().width;
      if (width <= 0) return;

      measureEl.style.width = `${width}px`;
      const lineHeight = parseFloat(window.getComputedStyle(bodyEl).lineHeight) || 24.75;
      const maxHeight = lineHeight * 3 + 0.5;

      const fits = (value: string) => {
        measureEl.textContent = value;
        return measureEl.scrollHeight <= maxHeight;
      };

      if (fits(cleanedText)) {
        setIsOverflowing(false);
        setTruncatedText(null);
        return;
      }

      let low = 0;
      let high = cleanedText.length;
      let best = "";

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = cleanedText.slice(0, mid).trimEnd();

        if (fits(`${candidate} more`)) {
          best = candidate;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      const lastSpace = best.lastIndexOf(" ");
      const trimmedToWord =
        lastSpace > 24 && best.length - lastSpace < 18
          ? best.slice(0, lastSpace).trimEnd()
          : best;

      setIsOverflowing(true);
      setTruncatedText(trimmedToWord);
    };

    calculateTruncation();
    const observer = new ResizeObserver(calculateTruncation);
    observer.observe(bodyEl);

    return () => observer.disconnect();
  }, [cleanedText]);

  const handleCommentClick = () => {
    setRepliesExpanded((e) => !e);
  };

  const handleReplyClick = () => {
    setReplyBoxOpen((o) => !o);
  };

  const resizeReplyTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  };

  const avatarStyle =
    comment.avatarBg && comment.avatarColor
      ? { background: comment.avatarBg, color: comment.avatarColor }
      : undefined;

  return (
    <div
      className={cn(
        "CommentCard w-full px-4 py-4 animate-fade-up border-b border-border last:border-b-0",
        depth > 0 && "border-l-2 border-l-border"
      )}
      style={{
        backgroundColor: "var(--color-bg)",
        ...(depth > 0
          ? {
              marginLeft: `${threadInsetPx}px`,
              paddingLeft: "8px",
            }
          : {}),
      }}
    >
      <div className="flex items-start min-w-0">
        <UsernameLink
          username={comment.username}
          displayName={comment.displayName}
          avatarUrl={comment.avatarUrl}
          initial={comment.avatarInitial}
          avatarBg={comment.avatarBg}
          avatarColor={comment.avatarColor}
          role={comment.role ?? undefined}
          roleContext={comment.roleContext}
          className="mr-2 flex-shrink-0 self-start no-underline"
        >
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm",
              !comment.avatarBg && "bg-neutral-300"
            )}
            style={avatarStyle}
          >
            {comment.avatarInitial}
          </div>
        </UsernameLink>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <UsernameLink
                username={comment.username}
                displayName={comment.displayName}
                avatarUrl={comment.avatarUrl}
                initial={comment.avatarInitial}
                avatarBg={comment.avatarBg}
                avatarColor={comment.avatarColor}
                role={comment.role ?? undefined}
                roleContext={comment.roleContext}
                className="group text-[13.5px] font-bold text-fg no-underline"
              >
                <span className="group-hover:underline underline-offset-2">
                  {comment.displayName ?? comment.username}
                </span>{" "}
                <span className="font-normal text-fg-muted">
                  @{comment.username}
                </span>
              </UsernameLink>
              <span className="text-xs text-fg-muted ">
                · {comment.timestamp}
              </span>
            </div>
            <PortalDropdown
              align="end"
              sideOffset={6}
              menuLabel="Comment actions"
              menuClassName="min-w-[238px] rounded-2xl border-border bg-elevated p-1.5 shadow-[0_20px_56px_rgba(0,0,0,0.18),0_4px_14px_rgba(0,0,0,0.08)]"
              itemLayout="rich"
              showArrow={false}
              items={[
                {
                  id: "share",
                  label: "Share comment",
                  description: "Send or copy this comment",
                  icon: <Share2 className="w-4 h-4" strokeWidth={1.8} />,
                },
                {
                  id: "report",
                  label: "Report comment",
                  description: "Flag a safety concern",
                  icon: <Flag className="w-4 h-4" strokeWidth={1.8} />,
                  danger: true,
                  dividerBefore: true,
                },
              ]}
              trigger={({ ref, toggle, onKeyDown, isOpen, menuId }) => (
                <button
                  ref={ref}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle();
                  }}
                  onKeyDown={onKeyDown}
                  aria-label="More options"
                  aria-expanded={isOpen}
                  aria-controls={menuId}
                  aria-haspopup="menu"
                  className={cn(
                    "group flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-fg-muted transition-all duration-150",
                    "hover:border-border hover:bg-hover hover:text-fg active:scale-95",
                    isOpen && "border-border bg-sunken text-fg shadow-[inset_0_1px_0_rgb(255_255_255/45%)]"
                  )}
                >
                  <MoreHorizontal
                    className={cn(
                      "w-4 h-4 transition-transform duration-150",
                      isOpen ? "scale-110" : "group-hover:scale-105"
                    )}
                    strokeWidth={2}
                  />
                </button>
              )}
            />
          </div>

          {comment.role != null && comment.role.trim() !== "" ? (
            <UserRoleHeadline
              role={comment.role.trim()}
              roleContext={comment.roleContext}
              filmsLoggedCount={comment.filmsLoggedCount}
              textClassName="text-[10.5px]"
            />
          ) : null}

          <div className="mt-1">
            {cleanedText.length > 0 && (
              <div className="relative">
                <div
                  ref={measureRef}
                  aria-hidden
                  className="pointer-events-none invisible absolute left-0 top-0 -z-10 whitespace-pre-wrap break-words text-[15px] leading-[1.65] text-fg"
                />
                <p
                  ref={bodyRef}
                  className="text-[15px] leading-[1.65] text-fg whitespace-pre-wrap break-words"
                >
                  <RichPostInline
                    text={expanded ? cleanedText : truncatedText ?? cleanedText}
                    segmentKeyPrefix="comment-body"
                  />
                  {!expanded && truncatedText != null && isOverflowing ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="inline border-none bg-transparent p-0 font-[inherit] font-medium text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline"
                        onClick={() => setExpanded(true)}
                      >
                        more
                      </button>
                    </>
                  ) : null}
                </p>
              </div>
            )}
            {expanded && isOverflowing && (
              <button
                type="button"
                className="text-text-tertiary hover:text-fg text-[13px] bg-transparent border-none p-0 cursor-pointer mt-1 block font-[inherit]"
                onClick={() => setExpanded(false)}
              >
                less
              </button>
            )}
            {previews.map((preview) => (
              <VideoUrlPreview key={`${preview.provider}:${preview.id}`} preview={preview} />
            ))}
            <PostActions
              likes={comment.likeCount}
              comments={comment.replyCount}
              initialLiked={comment.liked}
              onCommentClick={handleCommentClick}
              onReplyClick={handleReplyClick}
              hideRepostSaveLabels
              showReplyOption
            />
            {replyBoxOpen && (
              <div className="mt-2.5 ml-0.5">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-fg flex items-center justify-center mt-1">
                    {CURRENT_USER.avatarUrl ? (
                      <Image
                        src={CURRENT_USER.avatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[12px] text-white/85">
                        {CURRENT_USER.initial}
                      </span>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <textarea
                      ref={replyTextareaRef}
                      value={replyText}
                      placeholder={`Reply to ${comment.username}...`}
                      aria-label={`Reply to ${comment.username}`}
                      rows={1}
                      onChange={(e) => {
                        setReplyText(e.target.value);
                        resizeReplyTextarea(e.target);
                      }}
                      className="w-full resize-none overflow-y-auto min-h-[42px] border border-border rounded-md pl-3 pr-16 py-2 text-[12.5px] leading-[1.45] text-fg bg-elevated outline-none placeholder:text-fg-muted focus:border-fg-faint focus:ring-2 focus:ring-fg/5 transition-colors"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={replyText.trim().length === 0}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 h-7 text-[11px] font-medium px-2.5 rounded-md transition-colors flex items-center",
                        replyText.trim().length === 0
                          ? "bg-sunken-2 text-fg-faint cursor-not-allowed"
                          : "bg-fg text-white hover:bg-fg-2"
                      )}
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            )}
            {hasReplies && repliesExpanded && (
              <div className="mt-1.5 -mx-1">
                {comment.replies!.map((reply) => (
                  <CommentCard
                    key={reply.id}
                    comment={reply}
                    depth={depth + 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
