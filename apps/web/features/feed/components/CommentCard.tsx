"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import { PostActions } from "@/components/PostActions/PostActions";
import { PortalDropdown } from "@/components/PortalDropdown/PortalDropdown";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { CURRENT_USER } from "@/lib/constants/currentUser";
import { cn } from "@/lib/utils/cn";
import { RichPostInline } from "@/lib/utils/richPostText";
import { UserRoleHeadline } from "@/lib/utils/userRoleHeadline";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { useBlockUserMutation, useMuteUserMutation } from "@/features/profile/hooks/useProfile";
import {
  useDeleteComment,
  useLikeComment,
  useUpdateComment,
} from "../hooks/useCommentMutations";
import { Share2, Flag, MoreHorizontal, Pencil, Trash2, EyeOff, CircleSlash } from "lucide-react";
import { VideoUrlPreview } from "./VideoUrlPreview";
import { extractVideoPreviews } from "../utils/videoPreviews";
import { ApiRequestError } from "../api/http";
import { showGlobalFlashToast } from "@/components/FlashToast";

export interface Comment {
  id: string;
  parentId?: string | null;
  isDeleted?: boolean;
  authorId?: string;
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
  postId: string;
  depth?: number;
  onReplySubmit?: (input: { parentId: string; body: string }) => Promise<void>;
}

export function CommentCard({ comment, postId, depth = 0, onReplySubmit }: CommentCardProps) {
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [replyBoxOpen, setReplyBoxOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [truncatedText, setTruncatedText] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [muteToast, setMuteToast] = useState<{ handle: string; userId: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.text);
  const currentUserQuery = useCurrentUserProfile();
  const deleteCommentMutation = useDeleteComment(postId);
  const updateCommentMutation = useUpdateComment(postId);
  const likeCommentMutation = useLikeComment(postId);
  const blockUserMutation = useBlockUserMutation();
  const muteUserMutation = useMuteUserMutation();
  const isOwnComment =
    Boolean(comment.authorId) &&
    Boolean(currentUserQuery.data?.userId) &&
    comment.authorId === currentUserQuery.data?.userId;
  const canModerateAuthor =
    Boolean(comment.authorId) &&
    Boolean(currentUserQuery.data?.userId) &&
    comment.authorId !== currentUserQuery.data?.userId;
  const authorHandle = `@${comment.username}`;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const threadLevel = Math.min(depth, 6);
  const threadInsetPx = threadLevel * 6;
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const { cleanedText, previews } = extractVideoPreviews(comment.text);

  useLayoutEffect(() => {
    if (isEditing) return;

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
  }, [cleanedText, isEditing]);

  useEffect(function () {
    if (!isEditing) {
      setEditDraft(comment.text);
    }
  }, [comment.text, isEditing]);

  const handleCommentClick = () => {
    setRepliesExpanded((e) => !e);
  };

  const handleReplyClick = () => {
    setReplyBoxOpen((o) => !o);
  };

  const handleReplySubmit = async () => {
    var body = replyText.trim();
    if (!body || !onReplySubmit) return;
    try {
      await onReplySubmit({ parentId: comment.id, body });
      setReplyText("");
      setReplyBoxOpen(false);
    } catch (_err) {
      // parent mutation controls error state
    }
  };

  const handleSaveEdit = async () => {
    var body = editDraft.trim();
    if (!body || updateCommentMutation.isPending) return;

    try {
      await updateCommentMutation.mutateAsync({
        commentId: comment.id,
        body,
      });
      setIsEditing(false);
    } catch (_err) {
      // mutation error surfaces via invalidation/refetch
    }
  };

  const menuItems = [
    {
      id: "share",
      label: "Share comment",
      description: "Send or copy this comment",
      icon: <Share2 className="w-4 h-4" strokeWidth={1.8} />,
    },
    ...(isOwnComment
      ? [
          {
            id: "edit-comment",
            label: "Edit comment",
            description: "Update your comment text",
            icon: <Pencil className="w-4 h-4" strokeWidth={1.8} />,
            dividerBefore: true,
            onSelect: function () {
              setEditDraft(comment.text);
              setIsEditing(true);
            },
          },
          {
            id: "delete-comment",
            label: "Delete comment",
            description: "Remove this comment from the thread",
            icon: <Trash2 className="w-4 h-4" strokeWidth={1.8} />,
            danger: true,
            onSelect: function () {
              setShowDeleteConfirm(true);
            },
          },
        ]
      : [
          ...(canModerateAuthor && comment.authorId
            ? [
                {
                  id: "mute-user",
                  label: `Mute ${authorHandle}`,
                  description: "Hide their posts from your feed",
                  icon: <EyeOff className="w-4 h-4" strokeWidth={1.8} />,
                  dividerBefore: true,
                  onSelect: function () {
                    muteUserMutation.mutate(
                      { userId: comment.authorId as string, muted: false },
                      {
                        onSuccess: function () {
                          setMuteToast({
                            handle: authorHandle,
                            userId: comment.authorId as string,
                          });
                        },
                      }
                    );
                  },
                },
                {
                  id: "block-user",
                  label: `Block ${authorHandle}`,
                  description: "Remove and prevent interaction",
                  icon: <CircleSlash className="w-4 h-4" strokeWidth={1.8} />,
                  danger: true,
                  onSelect: function () {
                    setShowBlockConfirm(true);
                  },
                },
              ]
            : []),
          {
            id: "report",
            label: "Report comment",
            description: "Flag a safety concern",
            icon: <Flag className="w-4 h-4" strokeWidth={1.8} />,
            danger: true,
            dividerBefore: !canModerateAuthor,
          },
        ]),
  ];

  const resizeReplyTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  };

  if (comment.isDeleted) {
    return (
      <div
        id={`comment-${comment.id}`}
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
        <p className="text-[13px] italic text-fg-muted">This comment was deleted</p>
        {hasReplies ? (
          <div className="mt-1.5 -mx-1">
            {comment.replies!.map((reply) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                postId={postId}
                depth={depth + 1}
                onReplySubmit={onReplySubmit}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      id={`comment-${comment.id}`}
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
          <Avatar
            initial={comment.avatarInitial}
            src={comment.avatarUrl}
            className="h-10 w-10"
          />
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
              items={menuItems}
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
            {isEditing ? (
              <div className="mt-1">
                <textarea
                  value={editDraft}
                  onChange={function (e) {
                    setEditDraft(e.target.value);
                  }}
                  rows={3}
                  className="w-full resize-y min-h-[84px] rounded-md border border-border bg-elevated px-3 py-2 text-[15px] leading-[1.55] text-fg outline-none focus:border-fg-faint focus:ring-2 focus:ring-fg/5"
                  autoFocus
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={editDraft.trim().length === 0 || updateCommentMutation.isPending}
                    onClick={function () {
                      void handleSaveEdit();
                    }}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                      editDraft.trim().length === 0 || updateCommentMutation.isPending
                        ? "cursor-not-allowed bg-sunken-2 text-fg-faint"
                        : "bg-fg text-bg hover:opacity-90"
                    )}
                  >
                    {updateCommentMutation.isPending ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={function () {
                      setIsEditing(false);
                      setEditDraft(comment.text);
                    }}
                    className="rounded-full px-3.5 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-hover hover:text-fg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            {!isEditing && cleanedText.length > 0 && (
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
            {!isEditing && expanded && isOverflowing && (
              <button
                type="button"
                className="text-text-tertiary hover:text-fg text-[13px] bg-transparent border-none p-0 cursor-pointer mt-1 block font-[inherit]"
                onClick={() => setExpanded(false)}
              >
                less
              </button>
            )}
            {!isEditing &&
              previews.map((preview) => (
                <VideoUrlPreview key={`${preview.provider}:${preview.id}`} preview={preview} />
              ))}
            <PostActions
              likes={comment.likeCount}
              comments={comment.replyCount}
              hideZeroCounts
              useCompactVariant
              initialLiked={comment.liked}
              onCommentClick={handleCommentClick}
              onReplyClick={handleReplyClick}
              onLikeToggle={function ({ isLiked }) {
                likeCommentMutation.mutate(
                  { commentId: comment.id, isLiked },
                  {
                    onError: function (error) {
                      var message =
                        error instanceof ApiRequestError
                          ? error.message
                          : "Could not update comment like";
                      showGlobalFlashToast(message, "error");
                    },
                  }
                );
              }}
              hideRepostSaveLabels
              showReplyOption={depth < 2}
            />
            {replyBoxOpen && depth < 2 && (
              <div className="mt-2.5 ml-0.5">
                <div className="flex items-start gap-2">
                  <Avatar
                    initial={CURRENT_USER.initial}
                    src={CURRENT_USER.avatarUrl}
                    className="mt-1 w-8 h-8"
                  />
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
                      onClick={() => void handleReplySubmit()}
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
                    postId={postId}
                    depth={depth + 1}
                    onReplySubmit={onReplySubmit}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={function () {
          setShowDeleteConfirm(false);
        }}
        onConfirm={function () {
          if (deleteCommentMutation.isPending) return;
          deleteCommentMutation.mutate(comment.id, {
            onSuccess: function () {
              setShowDeleteConfirm(false);
            },
          });
        }}
        title="Delete comment?"
        description="This comment will be removed from the thread."
        confirmLabel={deleteCommentMutation.isPending ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        variant="danger"
      />
      <ConfirmDialog
        open={showBlockConfirm}
        onClose={function () {
          setShowBlockConfirm(false);
        }}
        onConfirm={function () {
          if (!comment.authorId || blockUserMutation.isPending) return;
          blockUserMutation.mutate({ userId: comment.authorId, blocked: false });
          setShowBlockConfirm(false);
        }}
        title={`Block ${authorHandle}?`}
        description="They won't be able to see your profile, posts, or interact with you."
        confirmLabel="Block"
        cancelLabel="Cancel"
        variant="danger"
      />
      {muteToast ? (
        <div className="pointer-events-auto fixed bottom-6 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-3 rounded-full bg-fg px-4 py-2 text-xs font-medium text-bg shadow-lg">
          <span>{muteToast.handle} muted</span>
          <button
            type="button"
            className="border-none bg-transparent p-0 font-semibold text-bg underline underline-offset-2"
            onClick={function () {
              muteUserMutation.mutate(
                { userId: muteToast.userId, muted: true },
                { onSuccess: function () { setMuteToast(null); } }
              );
            }}
          >
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
