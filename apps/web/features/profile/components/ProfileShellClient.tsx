"use client";

import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/Button";
import { ApiRequestError } from "@/features/feed/api/http";
import { CoverPhoto } from "@/features/profile/components/CoverPhoto";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileScrollChrome } from "@/features/profile/components/ProfileScrollChrome";
import { ProfileBody } from "@/features/profile/components/ProfileBody";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { useBlockUserMutation, useFollowToggle, usePublicProfile } from "@/features/profile/hooks/useProfile";

export function ProfileShellClient(props: { username: string }) {
  var username = props.username;
  var currentUserQuery = useCurrentUserProfile();
  var currentUser = currentUserQuery.data;
  var profileQuery = usePublicProfile(username);

  var [avatarUrlOverride, setAvatarUrlOverride] = useState<string | null>(null);
  var [coverUrlOverride, setCoverUrlOverride] = useState<string | null>(null);

  var profile = profileQuery.data;
  var followToggleMutation = useFollowToggle(username);
  var blockMutation = useBlockUserMutation();

  var isOwnProfile =
    Boolean(profile?.username) && profile?.username === currentUser?.username;
  var isPrivateGate =
    Boolean(profile?.isPrivate) &&
    !Boolean(profile?.isFollowing) &&
    !Boolean(isOwnProfile);

  var effectiveAvatarUrl = avatarUrlOverride ?? profile?.avatarUrl ?? null;
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
          avatarUrl={effectiveAvatarUrl}
          onAvatarUrlChange={setAvatarUrlOverride}
          location={resolvedProfile.location ?? ""}
          website={resolvedProfile.website ?? ""}
          dateOfBirth={resolvedProfile.dateOfBirth ?? ""}
          followerCount={resolvedProfile.followerCount}
          followingCount={resolvedProfile.followingCount}
          filmsLoggedCount={resolvedProfile.filmsLoggedCount ?? 0}
          isFollowing={resolvedProfile.isFollowing}
          isFollowRequested={resolvedProfile.isFollowRequested}
          isMutedByViewer={Boolean(resolvedProfile.isMutedByViewer)}
        />
      </ProfileScrollChrome>
      {isPrivateGate ? (
        <div className="mx-auto mt-10 w-full max-w-[640px] rounded-2xl border border-border bg-bg px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-fg-muted">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-fg">This account is private</h2>
          <p className="mt-2 text-sm text-fg-muted">
            Follow {resolvedProfile.displayName} to see their posts
          </p>
          <div className="mt-5">
            <Button
              variant={resolvedProfile.isFollowRequested ? "secondary" : "primary"}
              size="sm"
              onClick={function () {
                if (followToggleMutation.isPending) return;
                followToggleMutation.mutate({
                  userId: resolvedProfile.userId,
                  isFollowing: resolvedProfile.isFollowing,
                  isFollowRequested: resolvedProfile.isFollowRequested,
                });
              }}
            >
              {followToggleMutation.isPending
                ? "..."
                : resolvedProfile.isFollowRequested
                  ? "Requested"
                  : "Follow"}
            </Button>
          </div>
        </div>
      ) : (
        <ProfileBody
          username={resolvedProfile.username}
          displayName={resolvedProfile.displayName}
          bio={resolvedProfile.bio ?? ""}
          location={resolvedProfile.location ?? ""}
          website={resolvedProfile.website ?? ""}
          isPrivate={Boolean(resolvedProfile.isPrivate)}
          role={resolvedProfile.role}
          roleContext={resolvedProfile.roleContext}
          headline={resolvedProfile.headline ?? null}
          headlineContext={resolvedProfile.headlineContext ?? null}
        />
      )}
    </>
  );
}
