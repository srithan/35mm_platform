"use client";

import { PostComposerModal } from "@/features/feed/components/PostComposerModal";
import { CURRENT_USER } from "@/lib/constants/currentUser";
import { useComposerModalStore } from "@/stores/useComposerModalStore";

const DEFAULT_USER = {
  name: CURRENT_USER.name,
  avatarUrl: CURRENT_USER.avatarUrl,
  initial: CURRENT_USER.initial,
  handle: CURRENT_USER.handle,
};

export function ComposerModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isComposerModalOpen = useComposerModalStore((s) => s.isOpen);
  const closeComposerModal = useComposerModalStore((s) => s.close);

  return (
    <>
      {children}
      <PostComposerModal
        isOpen={isComposerModalOpen}
        onClose={closeComposerModal}
        user={DEFAULT_USER}
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
    openComposerModal,
    closeComposerModal,
  };
}
