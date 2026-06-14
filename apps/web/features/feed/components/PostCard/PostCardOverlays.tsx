"use client";

import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { ShareModal } from "@/components/ShareModal/ShareModal";
import { ROUTES } from "@/lib/constants/routes";
import { useBlockUserMutation, useMuteUserMutation } from "@/features/profile/hooks/useProfile";
import { useDeletePost } from "../../hooks/usePostMutations";
import { MuteUndoToast } from "../shared/MuteUndoToast";
import type { PostCardFilmCard } from "./types";

interface PostCardOverlaysProps {
  username: string;
  handle: string;
  userId?: string;
  postId?: string;
  headline?: string;
  cleanedText: string;
  filmCard?: PostCardFilmCard;
  isPostDetailView: boolean;
  showShareModal: boolean;
  showReportConfirm: boolean;
  showDeleteConfirm: boolean;
  showBlockConfirm: boolean;
  muteToast: { handle: string; userId: string } | null;
  onCloseShareModal: () => void;
  onCloseReportConfirm: () => void;
  onCloseDeleteConfirm: () => void;
  onCloseBlockConfirm: () => void;
  onClearMuteToast: () => void;
}

export function PostCardOverlays({
  username,
  handle,
  userId,
  postId,
  headline,
  cleanedText,
  filmCard,
  isPostDetailView,
  showShareModal,
  showReportConfirm,
  showDeleteConfirm,
  showBlockConfirm,
  muteToast,
  onCloseShareModal,
  onCloseReportConfirm,
  onCloseDeleteConfirm,
  onCloseBlockConfirm,
  onClearMuteToast,
}: PostCardOverlaysProps) {
  const router = useRouter();
  const deleteMutation = useDeletePost();
  const blockUserMutation = useBlockUserMutation();
  const muteUserMutation = useMuteUserMutation();

  return (
    <>
      <ConfirmDialog
        open={showBlockConfirm}
        onClose={onCloseBlockConfirm}
        onConfirm={() => {
          if (!userId) return;
          blockUserMutation.mutate({ userId, blocked: false });
          onCloseBlockConfirm();
        }}
        title={`Block ${handle}?`}
        description={`They won't be able to see your profile, posts, or interact with you. You can unblock them anytime in Settings.`}
        confirmLabel="Block"
        cancelLabel="Cancel"
        variant="danger"
      />
      <ConfirmDialog
        open={showReportConfirm}
        onClose={onCloseReportConfirm}
        onConfirm={() => {
          // TODO: wire to actual report API
          onCloseReportConfirm();
        }}
        title="Report this post?"
        description="If this post is violating our community guidelines, we'll review it and take appropriate action."
        confirmLabel="Report"
        cancelLabel="Cancel"
        variant="danger"
      />
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={onCloseDeleteConfirm}
        onConfirm={() => {
          if (!postId) return;
          deleteMutation.mutate(
            { postId },
            {
              onSuccess: () => {
                onCloseDeleteConfirm();
                if (isPostDetailView) {
                  router.replace(ROUTES.PROFILE(username));
                }
              },
            }
          );
        }}
        title="Delete this post?"
        description="This will remove the post from your profile and all feeds."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
      <ShareModal
        open={showShareModal}
        onClose={onCloseShareModal}
        url={
          typeof window !== "undefined"
            ? `${window.location.origin}${ROUTES.POST(username, postId || "")}`
            : ""
        }
        title={`${username} on 35mm`}
        previewContent={{
          type: "post",
          title: username,
          description: (headline ? headline + " — " : "") + cleanedText.slice(0, 100),
          image: filmCard?.posterSrc || undefined,
        }}
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
