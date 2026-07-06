"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Search, UserX } from "lucide-react";
import { useLayoutEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { useShellLayout } from "@/components/layout/ShellLayoutContext";
import { ApiRequestError } from "@/features/feed/api/http";
import { CoverPhoto } from "@/features/profile/components/CoverPhoto";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileScrollChrome } from "@/features/profile/components/ProfileScrollChrome";
import { ProfileBody } from "@/features/profile/components/ProfileBody";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { useBlockUserMutation, usePublicProfile } from "@/features/profile/hooks/useProfile";
import { ROUTES } from "@/lib/constants/routes";
import { showGlobalFlashToast } from "@/components/FlashToast";
import { getChatErrorMessage } from "@/features/chat/api/errors";
import { useCreateConversation } from "@/features/chat/hooks/useChatQueries";

export function ProfileShellClient(props: { username: string }) {
  var username = props.username;
  var currentUserQuery = useCurrentUserProfile();
  var currentUser = currentUserQuery.data;
  var profileQuery = usePublicProfile(username);
  var { isSignedIn } = useAuth();
  var createConversationMutation = useCreateConversation();
  var router = useRouter();
  var { setProfileRailDisabled } = useShellLayout();

  var [avatarUrlOverride, setAvatarUrlOverride] = useState<string | null>(null);
  var [coverUrlOverride, setCoverUrlOverride] = useState<string | null>(null);

  var profile = profileQuery.data;
  var blockMutation = useBlockUserMutation();

  const profileUserId = profile?.userId;
  const currentUserId = currentUser?.userId;
  const profileUsername = profile?.username;
  const currentUsername = currentUser?.username;
  var isOwnProfile =
    (Boolean(profileUserId) &&
      Boolean(currentUserId) &&
      profileUserId === currentUserId) ||
    (Boolean(profileUsername) &&
      Boolean(currentUsername) &&
      profileUsername === currentUsername);
	  var isPrivateGate =
	    Boolean(profile?.isPrivate) &&
	    profile?.followState !== "following" &&
	    !Boolean(isOwnProfile);

  var effectiveAvatarUrl = avatarUrlOverride ?? profile?.avatarUrl ?? null;
  var effectiveAvatarUrlLg = avatarUrlOverride ?? profile?.avatarUrlLg ?? profile?.avatarUrl ?? null;
  var effectiveCoverUrl = coverUrlOverride ?? profile?.coverUrl ?? null;
  var profileError = profileQuery.isError ? profileQuery.error : null;
  var isBlockedProfileError =
    profileError instanceof ApiRequestError && profileError.code === "BLOCKED";
  var isProfileNotFound =
    !profileQuery.isPending &&
    !isBlockedProfileError &&
    (!profile || profileQuery.isError);

  var stableTagline = useMemo(function () {
    if (!profile) return "";
    if (profile.role === "Cinephile") {
      return `${(profile.filmsLoggedCount ?? 0).toLocaleString()} films logged`;
    }
    if (profile.role && profile.role.trim().length > 0) {
      return profile.roleContext?.trim() || profile.role;
    }
    return "Cinephile";
  }, [profile]);

  useLayoutEffect(
    function () {
      setProfileRailDisabled(isProfileNotFound);
      return function () {
        setProfileRailDisabled(false);
      };
    },
    [isProfileNotFound, setProfileRailDisabled]
  );

  if (!profile && profileQuery.isPending) {
    return <div className="min-h-[40vh] animate-pulse" />;
  }

  if (profileQuery.isError && isBlockedProfileError && profileError instanceof ApiRequestError) {
    var blockedByYou = profileError.message.startsWith("BLOCKED_BY_YOU:");
    var blockedUserId = blockedByYou ? profileError.message.split(":")[1] : null;
    return (
      <div className="mx-auto mt-16 w-full max-w-[640px] rounded-2xl border border-border bg-bg px-6 py-10 text-center">
        <h2 className="text-lg font-semibold text-fg">
          {blockedByYou ? "You've blocked this account" : "You're blocked"}
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          {blockedByYou
            ? "Unblock to view this profile again."
            : "This account has blocked you."}
        </p>
        {blockedByYou && blockedUserId ? (
          <div className="mt-5">
            <Button
              variant="secondary"
              size="sm"
              onClick={function () {
                if (blockMutation.isPending || !blockedUserId) return;
                blockMutation.mutate({ userId: blockedUserId, blocked: true });
              }}
            >
              {blockMutation.isPending ? "..." : "Unblock"}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (!profile || profileQuery.isError) {
    return (
      <div className="mx-auto flex w-full max-w-[1040px] justify-center px-5 pb-16 pt-8 text-center md:px-8 md:pt-10">
        <div className="w-full border-b border-border px-4 pb-12 pt-6 md:px-8 md:pb-16 md:pt-8">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-sunken text-fg shadow-[0_1px_0_rgb(15_23_42/4%)]"
            aria-hidden="true"
          >
            <UserX className="h-7 w-7" strokeWidth={1.8} />
          </div>
          <p className="mt-6 text-[13px] font-semibold text-accent">
            No profile here
          </p>
          <h1 className="mt-2 font-display-discover text-[34px] leading-tight text-fg md:text-[42px]">
            Profile not found
          </h1>
          <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-7 text-fg-muted">
            We could not find @{username}. The account may have changed names, been removed,
            or the link may be misspelled.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href={ROUTES.HOME}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-fg bg-fg px-5 text-[13.5px] font-semibold text-bg transition-all duration-150 hover:opacity-90"
            >
              <Home className="h-4 w-4" strokeWidth={2} />
              Home
            </Link>
            <Link
              href={ROUTES.SUGGESTIONS_PEOPLE}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-transparent px-5 text-[13.5px] font-semibold text-fg transition-all duration-150 hover:border-fg-muted hover:bg-hover"
            >
              <Search className="h-4 w-4" strokeWidth={2} />
              Find people
            </Link>
          </div>
        </div>
      </div>
    );
  }

  var resolvedProfile = profile;
  var handleMessageClick = function () {
    if (!isSignedIn) {
      showGlobalFlashToast("Sign in to send messages.", "error");
      return;
    }
    if (createConversationMutation.isPending) {
      return;
    }
    createConversationMutation.mutate(
      {
        type: "dm",
        memberIds: [resolvedProfile.userId],
        member: {
          username: resolvedProfile.username,
          displayName: resolvedProfile.displayName,
        },
      },
      {
        onSuccess: function (thread) {
          var hasExistingMessages = Boolean(thread.lastMessageAt);
          var search = new URLSearchParams({
            source: "profile-message",
            hasExistingMessages: hasExistingMessages ? "1" : "0",
          });
          router.push(ROUTES.CHAT_WITH(thread.id) + "?" + search.toString());
        },
        onError: function (error) {
          showGlobalFlashToast(getChatErrorMessage(error), "error");
        },
      }
    );
  };

  return (
    <>
      <ProfileScrollChrome
        displayName={resolvedProfile.displayName}
        tagline={stableTagline}
        avatarUrl={effectiveAvatarUrl}
        cover={
          <CoverPhoto
            isOwnProfile={isOwnProfile}
            coverUrl={effectiveCoverUrl}
            onUploadComplete={function (nextCoverUrl) {
              setCoverUrlOverride(nextCoverUrl);
            }}
          />
        }
      >
        <ProfileHeader
          userId={resolvedProfile.userId}
          username={resolvedProfile.username}
          displayName={resolvedProfile.displayName}
          bio={resolvedProfile.bio ?? ""}
          isOwnProfile={isOwnProfile}
          avatarUrl={effectiveAvatarUrlLg}
          onAvatarUrlChange={setAvatarUrlOverride}
          location={resolvedProfile.location ?? ""}
          website={resolvedProfile.website ?? ""}
          dateOfBirth={resolvedProfile.dateOfBirth ?? ""}
          role={resolvedProfile.role}
          roleContext={resolvedProfile.roleContext}
          onMessageClick={handleMessageClick}
          isMessageActionPending={createConversationMutation.isPending}
          followerCount={resolvedProfile.followerCount}
          followingCount={resolvedProfile.followingCount}
	          filmsLoggedCount={resolvedProfile.filmsLoggedCount ?? 0}
	          followState={resolvedProfile.followState}
	          hasIncomingFollowRequest={Boolean(resolvedProfile.hasPendingRequestToViewer)}
          isPrivate={Boolean(resolvedProfile.isPrivate)}
          isMutedByViewer={Boolean(resolvedProfile.isMutedByViewer)}
        />
      </ProfileScrollChrome>
      <ProfileBody
        username={resolvedProfile.username}
        displayName={resolvedProfile.displayName}
        bio={resolvedProfile.bio ?? ""}
        location={resolvedProfile.location ?? ""}
        website={resolvedProfile.website ?? ""}
        dateOfBirth={resolvedProfile.dateOfBirth ?? ""}
        isOwnProfile={isOwnProfile}
        isPrivate={Boolean(resolvedProfile.isPrivate)}
        isPrivateGate={isPrivateGate}
        role={resolvedProfile.role}
        roleContext={resolvedProfile.roleContext}
        headline={resolvedProfile.headline ?? null}
        headlineContext={resolvedProfile.headlineContext ?? null}
        followerCount={resolvedProfile.followerCount}
        followingCount={resolvedProfile.followingCount}
        filmsLoggedCount={resolvedProfile.filmsLoggedCount ?? 0}
      />
    </>
  );
}
