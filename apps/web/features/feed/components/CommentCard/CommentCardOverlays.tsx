"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { useBlockUserMutation, useMuteUserMutation } from "@/features/profile/hooks/useProfile";
import { useDeleteComment } from "../../hooks/useCommentMutations";
import { MuteUndoToast } from "../shared/MuteUndoToast";

interface CommentCardOverlaysProps {
  postId: string;
  commentId: string;
  authorHandle: string;
  authorId?: string;
  showDeleteConfirm: boolean;
  showBlockConfirm: boolean;
  muteToast: { handle: string; userId: string } | null;
  onCloseDeleteConfirm: () => void;
  onCloseBlockConfirm: () => void;
  onClearMuteToast: () => void;
}

export function CommentCardOverlays({
  postId,
  commentId,
  authorHandle,
  authorId,
  showDeleteConfirm,
  showBlockConfirm,
  muteToast,
  onCloseDeleteConfirm,
  onCloseBlockConfirm,
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
