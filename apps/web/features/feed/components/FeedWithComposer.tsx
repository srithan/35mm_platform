"use client";

import { useUser } from "@clerk/nextjs";
import { useComposerModal } from "@/components/layout/PostComposerModalContext";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { PostComposerTrigger } from "./PostComposerTrigger";
import type { PostComposerTriggerUser } from "./PostComposerTrigger";

interface FeedWithComposerProps {
  user?: PostComposerTriggerUser & { handle?: string };
  children: React.ReactNode;
}

export function FeedWithComposer({ user, children }: FeedWithComposerProps) {
  const { openComposerModal } = useComposerModal();
  const { user: clerkUser } = useUser();
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const displayName =
    user?.name ?? currentUser?.displayName ?? clerkUser?.fullName ?? clerkUser?.username ?? "Profile";
  const avatarUrl = user?.avatarUrl ?? currentUser?.avatarUrl ?? null;
  const suppressDefaultAvatar = !user?.avatarUrl &&
    !currentUser?.avatarUrl &&
    (
      currentUserQuery.isPending ||
      currentUserQuery.isLoading ||
      currentUserQuery.isFetching ||
      currentUserQuery.fetchStatus !== "idle"
    );

  const triggerUser: PostComposerTriggerUser = {
    name: displayName,
    avatarUrl,
    initial: user?.initial ?? initialForName(displayName),
  };

  return (
    <>
      <PostComposerTrigger
        onOpen={openComposerModal}
        user={triggerUser}
        suppressDefaultAvatar={suppressDefaultAvatar}
      />
      {children}
    </>
  );
}
