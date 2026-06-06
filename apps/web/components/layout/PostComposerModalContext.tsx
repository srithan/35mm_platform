"use client";

import { useUser } from "@clerk/nextjs";
import { PostComposerModal } from "@/features/feed/components/PostComposerModal";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { type ComposerInitialMode, useComposerModalStore } from "@/stores/useComposerModalStore";

export function ComposerModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isComposerModalOpen = useComposerModalStore((s) => s.isOpen);
  const closeComposerModal = useComposerModalStore((s) => s.close);
  const quotedPost = useComposerModalStore((s) => s.quotedPost);
  const editingPost = useComposerModalStore((s) => s.editingPost);
  const initialMode = useComposerModalStore((s) => s.initialMode);
  const { user: clerkUser } = useUser();
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const displayName =
    currentUser?.displayName ?? clerkUser?.fullName ?? clerkUser?.username ?? "Profile";
  const username = currentUser?.username ?? clerkUser?.username;
  const modalUser = {
    name: displayName,
    avatarUrl: currentUser?.avatarUrl ?? clerkUser?.imageUrl ?? null,
    initial: initialForName(displayName),
    handle: username ?? undefined,
  };

  return (
    <>
      {children}
      <PostComposerModal
        isOpen={isComposerModalOpen}
        onClose={closeComposerModal}
        user={modalUser}
        quotedPost={quotedPost}
        editingPost={editingPost}
        initialMode={initialMode}
      />
    </>
  );
}

export function useComposerModal() {
  const isComposerModalOpen = useComposerModalStore((s) => s.isOpen);
  const openComposerModal = useComposerModalStore((s) => s.open);
  const closeComposerModal = useComposerModalStore((s) => s.close);

  return {
    isComposerModalOpen,
    openComposerModal: function (quoted?: Parameters<typeof openComposerModal>[0], options?: { initialMode?: ComposerInitialMode }) {
      openComposerModal(quoted, options?.initialMode);
    },
    closeComposerModal,
  };
}
