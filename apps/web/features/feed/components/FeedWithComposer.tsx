"use client";

import { useUser } from "@clerk/nextjs";
import { useComposerModal } from "@/components/layout/PostComposerModalContext";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { POST_COMPOSER_ENTRY_VARIANT } from "@/lib/config/uiFlags";
import { PostComposerTrigger } from "./PostComposerTrigger";
import type { PostComposerTriggerUser } from "./PostComposerTrigger";
import { InlinePostComposer } from "./InlinePostComposer";
import { FEED_DESKTOP_COLUMN_FRAME_CLASS } from "./feedDesktopColumnFrame";

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
  const useInlineComposer = POST_COMPOSER_ENTRY_VARIANT === "inline";
  const useSimplifiedTrigger =
    POST_COMPOSER_ENTRY_VARIANT === "simplified-trigger";

  return (
    <>
      {useInlineComposer ? (
        <InlinePostComposer
          user={triggerUser}
          suppressDefaultAvatar={suppressDefaultAvatar}
        />
      ) : (
        <PostComposerTrigger
          onOpen={openComposerModal}
          user={triggerUser}
          suppressDefaultAvatar={suppressDefaultAvatar}
          simplified={useSimplifiedTrigger}
        />
      )}
      <div className={FEED_DESKTOP_COLUMN_FRAME_CLASS}>
        {children}
      </div>
    </>
  );
}
