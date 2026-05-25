"use client";

import { Suspense, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/Button";
import { ApiRequestError } from "@/features/feed/api/http";
import { CoverPhoto } from "@/features/profile/components/CoverPhoto";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileScrollChrome } from "@/features/profile/components/ProfileScrollChrome";
import { ProfileBody } from "@/features/profile/components/ProfileBody";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { useBlockUserMutation, useFollowToggle, usePublicProfile } from "@/features/profile/hooks/useProfile";

interface ProfilePageClientProps {
  username: string;
}

export function ProfilePageClient({ username }: ProfilePageClientProps) {
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const profileQuery = usePublicProfile(username);

  const [avatarUrlOverride, setAvatarUrlOverride] = useState<string | null>(null);
  const [coverUrlOverride, setCoverUrlOverride] = useState<string | null>(null);

  const profile = profileQuery.data;
  const followToggleMutation = useFollowToggle(username);
  const blockMutation = useBlockUserMutation();

  const isOwnProfile =
    Boolean(profile?.username) && profile?.username === currentUser?.username;
  const isPrivateGate =
    Boolean(profile?.isPrivate) &&
    !Boolean(profile?.isFollowing) &&
    !Boolean(isOwnProfile);

  const effectiveAvatarUrl = avatarUrlOverride ?? profile?.avatarUrl ?? null;
  const effectiveCoverUrl = coverUrlOverride ?? profile?.coverUrl ?? null;

  const stableTagline = useMemo(function () {
    if (!profile) return "";
    if (profile.role === "Cinephile") {
      return `${(profile.filmsLoggedCount ?? 0).toLocaleString()} films logged`;
    }
    if (profile.role && profile.role.trim().length > 0) {
      return profile.roleContext?.trim() || profile.role;
    }
    return "Cinephile";
  }, [profile]);

  if (profileQuery.isPending || (!profileQuery.isFetched && !profileQuery.isError)) {
    return <div className="min-h-[40vh] animate-pulse" />;
  }

  if (profileQuery.isError) {
    const error = profileQuery.error;
    if (error instanceof ApiRequestError && error.code === "BLOCKED") {
      const blockedByYou = error.message.startsWith("BLOCKED_BY_YOU:");
      const blockedUserId = blockedByYou ? error.message.split(":")[1] : null;
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
                onClick={() => {
                  if (blockMutation.isPending) return;
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

  return (
    <div className="min-h-screen w-full box-border px-0">
      <ProfileScrollChrome
        displayName={profile.displayName}
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
          userId={profile.userId}
          username={profile.username}
          displayName={profile.displayName}
          bio={profile.bio ?? ""}
          isOwnProfile={isOwnProfile}
          avatarUrl={effectiveAvatarUrl}
          onAvatarUrlChange={setAvatarUrlOverride}
          location={profile.location ?? ""}
          website={profile.website ?? ""}
          dateOfBirth={profile.dateOfBirth ?? ""}
          followerCount={profile.followerCount}
          followingCount={profile.followingCount}
          filmsLoggedCount={profile.filmsLoggedCount ?? 0}
          isFollowing={profile.isFollowing}
          isFollowRequested={profile.isFollowRequested}
        />
      </ProfileScrollChrome>
      {isPrivateGate ? (
        <div className="mx-auto mt-10 w-full max-w-[640px] rounded-2xl border border-border bg-bg px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-fg-muted">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-fg">This account is private</h2>
          <p className="mt-2 text-sm text-fg-muted">
            Follow {profile.displayName} to see their posts
          </p>
          <div className="mt-5">
            <Button
              variant={profile.isFollowRequested ? "secondary" : "primary"}
              size="sm"
              onClick={() => {
                if (followToggleMutation.isPending) return;
                followToggleMutation.mutate({
                  userId: profile.userId,
                  isFollowing: profile.isFollowing,
                  isFollowRequested: profile.isFollowRequested,
                });
              }}
            >
              {followToggleMutation.isPending
                ? "..."
                : profile.isFollowRequested
                  ? "Requested"
                  : "Follow"}
            </Button>
          </div>
        </div>
      ) : (
        <Suspense fallback={<div className="mt-12 min-h-[120px]" />}>
          <ProfileBody
            username={profile.username}
            displayName={profile.displayName}
            bio={profile.bio ?? ""}
            location={profile.location ?? ""}
            website={profile.website ?? ""}
            isPrivate={Boolean(profile.isPrivate)}
            role={profile.role}
            roleContext={profile.roleContext}
            headline={profile.headline ?? null}
            headlineContext={profile.headlineContext ?? null}
          />
        </Suspense>
      )}
    </div>
  );
}
