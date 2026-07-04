"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { ApiRequestError } from "@/features/feed/api/http";
import { CoverPhoto } from "@/features/profile/components/CoverPhoto";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileScrollChrome } from "@/features/profile/components/ProfileScrollChrome";
import { ProfileBody } from "@/features/profile/components/ProfileBody";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { useBlockUserMutation, usePublicProfile } from "@/features/profile/hooks/useProfile";

export function ProfileShellClient(props: { username: string }) {
  var username = props.username;
  var currentUserQuery = useCurrentUserProfile();
  var currentUser = currentUserQuery.data;
  var profileQuery = usePublicProfile(username);

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

  if (!profile && profileQuery.isPending) {
    return <div className="min-h-[40vh] animate-pulse" />;
  }

  if (profileQuery.isError) {
    var error = profileQuery.error;
    if (error instanceof ApiRequestError && error.code === "BLOCKED") {
      var blockedByYou = error.message.startsWith("BLOCKED_BY_YOU:");
      var blockedUserId = blockedByYou ? error.message.split(":")[1] : null;
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
  }

  if (!profile || profileQuery.isError) {
    return (
      <div className="py-16 text-center text-sm text-fg-muted">
        Profile not found.
      </div>
    );
  }

  var resolvedProfile = profile;

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
