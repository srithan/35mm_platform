"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { hasVisibleRichText, isStoredRichText, storedRichTextToPlainText } from "@/lib/utils/richContent";
import { extractVideoPreviews } from "../../utils/videoPreviews";
import { useClampText } from "../../hooks/useClampText";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { useUpdateComment } from "../../hooks/useCommentMutations";
import type { CommentCardProps } from "./types";
import { getCommentThreadStyles } from "./types";
import { CommentCardDeleted } from "./CommentCardDeleted";
import { CommentCardHeader } from "./CommentCardHeader";
import { CommentCardMoreMenu } from "./CommentCardMoreMenu";
import { CommentCardBody } from "./CommentCardBody";
import { CommentCardReplyComposer } from "./CommentCardReplyComposer";
import { CommentCardActionsBar } from "./CommentCardActionsBar";
import { CommentCardReplies } from "./CommentCardReplies";
import { CommentCardOverlays } from "./CommentCardOverlays";

export function CommentCard({
  comment,
  postId,
  postBookmarked = false,
  postBookmarkFolderId = null,
  depth = 0,
  onReplySubmit,
}: CommentCardProps) {
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [replyBoxOpen, setReplyBoxOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [muteToast, setMuteToast] = useState<{ handle: string; userId: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.text);

  const currentUserQuery = useCurrentUserProfile();
  const updateCommentMutation = useUpdateComment(postId);

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
  const { containerStyle } = getCommentThreadStyles(depth);
  const displayText = storedRichTextToPlainText(comment.text);
  const { cleanedText, previews } = extractVideoPreviews(displayText);
  const renderText = isStoredRichText(comment.text) ? comment.text : cleanedText;

  const { bodyRef, measureRef, isOverflowing, truncatedText } = useClampText({
    text: cleanedText,
    enabled: !isEditing,
    lineHeightFallback: 24.75,
  });

  useEffect(() => {
    if (!isEditing) {
    setEditDraft(comment.text);
    }
  }, [comment.text, isEditing]);

  if (comment.isDeleted) {
    return (
      <CommentCardDeleted
        comment={comment}
        postId={postId}
        postBookmarked={postBookmarked}
        postBookmarkFolderId={postBookmarkFolderId}
        depth={depth}
        onReplySubmit={onReplySubmit}
      />
    );
  }

  const handleReplySubmit = async () => {
    const body = replyText;
    if (!hasVisibleRichText(body) || !onReplySubmit) return;

    setRepliesExpanded(true);

    try {
      await onReplySubmit({ parentId: comment.id, body });
      setReplyText("");
      setReplyBoxOpen(false);
    } catch (_err) {
      // parent mutation controls error state
    }
  };

  const handleSaveEdit = async () => {
    const body = editDraft;
    if (!hasVisibleRichText(body) || updateCommentMutation.isPending) return;

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

  const moreMenu = (
    <CommentCardMoreMenu
      postId={postId}
      postBookmarked={postBookmarked}
      postBookmarkFolderId={postBookmarkFolderId}
      isOwnComment={isOwnComment}
      canModerateAuthor={canModerateAuthor}
      authorHandle={authorHandle}
      authorId={comment.authorId}
      onEdit={() => {
        setEditDraft(comment.text);
        setIsEditing(true);
      }}
      onDeleteRequest={() => setShowDeleteConfirm(true)}
      onBlockRequest={() => setShowBlockConfirm(true)}
      onMuteSuccess={setMuteToast}
    />
  );

  return (
    <div
      id={`comment-${comment.id}`}
      className={cn(
        "CommentCard w-full bg-bg px-4 py-4 animate-fade-up border-b border-border transition-colors duration-150 hover:bg-card-hover last:border-b-0",
        depth > 0 && "border-l-2 border-l-border"
      )}
      style={containerStyle}
    >
      <div className="flex items-start min-w-0">
        <CommentCardHeader comment={comment} menu={moreMenu}>
          <CommentCardBody
            isEditing={isEditing}
            editDraft={editDraft}
            isSaving={updateCommentMutation.isPending}
            cleanedText={renderText}
            previews={previews}
            expanded={expanded}
            isOverflowing={isOverflowing}
            truncatedText={truncatedText}
            bodyRef={bodyRef}
            measureRef={measureRef}
            onEditDraftChange={setEditDraft}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={() => {
              setIsEditing(false);
              setEditDraft(comment.text);
            }}
            onExpand={() => setExpanded(true)}
            onCollapse={() => setExpanded(false)}
          />

          <CommentCardActionsBar
            postId={postId}
            commentId={comment.id}
            likeCount={comment.likeCount}
            replyCount={comment.replyCount}
            liked={comment.liked}
            depth={depth}
            onCommentClick={() => setRepliesExpanded((value) => !value)}
            onReplyClick={() => {
              setRepliesExpanded(true);
              setReplyBoxOpen((value) => !value);
            }}
          />

          <CommentCardReplyComposer
            open={replyBoxOpen}
            depth={depth}
            username={comment.username}
            displayName={comment.displayName}
            replyText={replyText}
            onReplyTextChange={setReplyText}
            onSubmit={handleReplySubmit}
            onCancel={function () {
              setReplyBoxOpen(false);
              setReplyText("");
            }}
          />

          {hasReplies ? (
            <CommentCardReplies
              replies={comment.replies!}
              postId={postId}
              postBookmarked={postBookmarked}
              postBookmarkFolderId={postBookmarkFolderId}
              depth={depth}
              expanded={repliesExpanded}
              onReplySubmit={onReplySubmit}
            />
          ) : null}
        </CommentCardHeader>
      </div>

      <CommentCardOverlays
        postId={postId}
        commentId={comment.id}
        authorHandle={authorHandle}
        authorId={comment.authorId}
        showDeleteConfirm={showDeleteConfirm}
        showBlockConfirm={showBlockConfirm}
        muteToast={muteToast}
        onCloseDeleteConfirm={() => setShowDeleteConfirm(false)}
        onCloseBlockConfirm={() => setShowBlockConfirm(false)}
        onClearMuteToast={() => setMuteToast(null)}
      />
    </div>
  );
}
