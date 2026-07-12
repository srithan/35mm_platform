"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useBlockUserMutation, useMuteUserMutation } from "@/features/profile/hooks/useProfile";
import { ReportFlow } from "@/features/moderation/components/ReportFlow";
import { useDeleteComment } from "../../hooks/useCommentMutations";
import { MuteUndoToast } from "../shared/MuteUndoToast";

interface CommentCardOverlaysProps {
  postId: string;
  commentId: string;
  authorHandle: string;
  authorId?: string;
  showDeleteConfirm: boolean;
  showBlockConfirm: boolean;
  showMuteConfirm: boolean;
  showReportConfirm: boolean;
  muteToast: { handle: string; userId: string } | null;
  onCloseDeleteConfirm: () => void;
  onCloseBlockConfirm: () => void;
  onCloseMuteConfirm: () => void;
  onCloseReportConfirm: () => void;
  onMuteSuccess: (payload: { handle: string; userId: string }) => void;
  onClearMuteToast: () => void;
}

export function CommentCardOverlays({
  postId,
  commentId,
  authorHandle,
  authorId,
  showDeleteConfirm,
  showBlockConfirm,
  showMuteConfirm,
  showReportConfirm,
  muteToast,
  onCloseDeleteConfirm,
  onCloseBlockConfirm,
  onCloseMuteConfirm,
  onCloseReportConfirm,
  onMuteSuccess,
  onClearMuteToast,
}: CommentCardOverlaysProps) {
  const deleteCommentMutation = useDeleteComment(postId);
  const blockUserMutation = useBlockUserMutation();
  const muteUserMutation = useMuteUserMutation();

  return (
    <>
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={onCloseDeleteConfirm}
        onConfirm={() => {
          if (deleteCommentMutation.isPending) return;
          deleteCommentMutation.mutate(commentId, {
            onSuccess: onCloseDeleteConfirm,
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
        onClose={onCloseBlockConfirm}
        onConfirm={() => {
          if (!authorId || blockUserMutation.isPending) return;
          blockUserMutation.mutate({ userId: authorId, blocked: false });
          onCloseBlockConfirm();
        }}
        title={`Block ${authorHandle}?`}
        description="They won't be able to see your profile, posts, or interact with you."
        confirmLabel="Block"
        cancelLabel="Cancel"
        variant="danger"
      />
      <ConfirmDialog
        open={showMuteConfirm}
        onClose={onCloseMuteConfirm}
        onConfirm={() => {
          if (!authorId || muteUserMutation.isPending) return;
          muteUserMutation.mutate(
            { userId: authorId, muted: false },
            {
              onSuccess: () => {
                onMuteSuccess({ handle: authorHandle, userId: authorId });
              },
            }
          );
        }}
        title={`Mute ${authorHandle}?`}
        description="Their posts won't appear in your feed. You can unmute them anytime in Settings."
        confirmLabel="Mute"
        cancelLabel="Cancel"
      />
      <ReportFlow
        open={showReportConfirm}
        onClose={onCloseReportConfirm}
        contentType="comment"
        contentId={commentId}
        targetLabel="this comment"
      />
      {muteToast ? (
        <MuteUndoToast
          handle={muteToast.handle}
          onUndo={() => {
            muteUserMutation.mutate(
              { userId: muteToast.userId, muted: true },
              { onSuccess: onClearMuteToast }
            );
          }}
        />
      ) : null}
    </>
  );
}
