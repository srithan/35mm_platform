"use client";

import { useComposerModal } from "@/components/layout/PostComposerModalContext";
import { CURRENT_USER } from "@/lib/constants/currentUser";
import { PostComposerTrigger } from "./PostComposerTrigger";
import type { PostComposerTriggerUser } from "./PostComposerTrigger";

const DEFAULT_USER: PostComposerTriggerUser & { handle?: string } = {
  name: CURRENT_USER.name,
  avatarUrl: CURRENT_USER.avatarUrl,
  initial: CURRENT_USER.initial,
  handle: CURRENT_USER.handle,
};

interface FeedWithComposerProps {
  user?: PostComposerTriggerUser & { handle?: string };
  children: React.ReactNode;
}

export function FeedWithComposer({ user = DEFAULT_USER, children }: FeedWithComposerProps) {
  const { openComposerModal } = useComposerModal();

  const triggerUser: PostComposerTriggerUser = {
    name: user.name,
    avatarUrl: user.avatarUrl,
    initial: user.initial,
  };

  return (
    <>
      <PostComposerTrigger
        onOpen={openComposerModal}
        user={triggerUser}
      />
      {children}
    </>
  );
}
