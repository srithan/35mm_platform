"use client";

import { useEffect, useState } from "react";
import { MoreVertical, UserPlus, VolumeX, CircleSlash, Flag } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/Icon/Icon";
import { Button } from "@/components/Button";
import { PortalDropdown } from "@/components/PortalDropdown/PortalDropdown";
import { Avatar } from "@/components/Avatar/Avatar";
import { AvatarViewer } from "@/components/Avatar/AvatarViewer";
import { ProfilePictureUpload } from "./ProfilePictureUpload";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { ShareModal } from "@/components/ShareModal/ShareModal";
import { EditProfileModal } from "./EditProfileModal";
import { ProfileStats } from "./ProfileStats";
import { notificationsKeys } from "@/features/notifications/hooks/queryKeys";
import { useBlockUserMutation, useFollowToggle, useMuteUserMutation } from "../hooks/useProfile";
import { profileKeys } from "../hooks/queryKeys";
import { acceptFollowRequest, declineFollowRequest } from "@/features/notifications/api/notificationsApi";

interface ProfileHeaderProps {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  showFollowButton?: boolean;
  isOwnProfile?: boolean;
  isMutedByViewer?: boolean;
  location?: string;
  website?: string;
  dateOfBirth?: string | null;
  isPrivate?: boolean;
  followerCount: number;
  followingCount: number;
  filmsLoggedCount: number;
  isFollowing: boolean;
  isFollowRequested?: boolean;
  hasIncomingFollowRequest?: boolean;
  avatarUrl?: string | null;
  onAvatarUrlChange?: (imageUrl: string | null) => void;
}

export function ProfileHeader({
  userId,
  username,
  displayName: initialDisplayName,
  bio: initialBio,
  isOwnProfile = false,
  isMutedByViewer: initialIsMutedByViewer = false,
  location: initialLocation = "",
  website: initialWebsite = "",
  dateOfBirth: initialDateOfBirth = "",
  followerCount,
  followingCount,
  filmsLoggedCount,
  isFollowing: initialIsFollowing,
  isFollowRequested: initialIsFollowRequested = false,
  isPrivate = false,
  hasIncomingFollowRequest = false,
  showFollowButton = true,
  avatarUrl: initialAvatarUrl = null,
  onAvatarUrlChange,
}: ProfileHeaderProps) {
  const { getToken, isLoaded } = useAuth();
  const queryClient = useQueryClient();
  const [isMutedByViewer, setIsMutedByViewer] = useState(initialIsMutedByViewer);
  const [confirmAction, setConfirmAction] = useState<
    "block" | "report" | "mute" | "unmute" | "unfollow" | null
  >(null);
  const [profileImage, setProfileImage] = useState<string | null>(initialAvatarUrl);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: initialDisplayName,
    username,
    bio: initialBio,
    location: initialLocation,
    website: initialWebsite,
    dateOfBirth: initialDateOfBirth ?? "",
  });
  const followToggleMutation = useFollowToggle(username);
  const blockMutation = useBlockUserMutation();
  const muteMutation = useMuteUserMutation();
  const acceptFollowRequestMutation = useMutation({
    mutationFn: async function () {
      return acceptFollowRequest({
        token: await getToken(),
        userId,
      });
    },
    onSuccess: async function () {
      await queryClient.invalidateQueries({ queryKey: profileKeys.detail(username) });
      await queryClient.invalidateQueries({ queryKey: profileKeys.followers(username) });
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
  });
  const declineFollowRequestMutation = useMutation({
    mutationFn: async function () {
      return declineFollowRequest({
        token: await getToken(),
        userId,
      });
    },
    onSuccess: async function () {
      await queryClient.invalidateQueries({ queryKey: profileKeys.detail(username) });
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
  });
  const isFollowing = initialIsFollowing;
  const isFollowRequested = Boolean(initialIsFollowRequested);
  const hasIncomingFollowRequestAction = Boolean(hasIncomingFollowRequest);
  const followAction = followToggleMutation.variables;
  const isPendingUnfollow = followAction?.isFollowing === true;
  const isCancelFollowRequest = followAction?.isFollowRequested === true;
  const isRespondingToIncomingFollowRequest =
    acceptFollowRequestMutation.isPending || declineFollowRequestMutation.isPending;

  useEffect(function () {
    setProfileData({
      displayName: initialDisplayName,
      username,
      bio: initialBio ?? "",
      location: initialLocation ?? "",
      website: initialWebsite ?? "",
      dateOfBirth: initialDateOfBirth ?? "",
    });
    setProfileImage(initialAvatarUrl);
    onAvatarUrlChange?.(initialAvatarUrl);
  }, [initialDisplayName, username, initialBio, initialLocation, initialWebsite, initialDateOfBirth, initialAvatarUrl]);

  useEffect(() => {
    setIsMutedByViewer(initialIsMutedByViewer);
  }, [initialIsMutedByViewer]);

  const handleAvatarChange = (imageUrl: string | null) => {
    setProfileImage(imageUrl);
    onAvatarUrlChange?.(imageUrl);
  };
  const confirmConfig = {
    block: {
      title: `Block @${username}?`,
      description: `They won't be able to see your posts or interact with you. You can unblock them at any time.`,
      confirmLabel: `Block @${username}`,
    },
    report: {
      title: `Report @${username}?`,
      description: `If this account is violating our community guidelines, we'll review it and take appropriate action.`,
      confirmLabel: "Report",
    },
    mute: {
      title: `Mute @${username}?`,
      description: `Their posts won't appear in your feed but they can still follow you and see your content.`,
      confirmLabel: `Mute @${username}`,
    },
    unmute: {
      title: `Unmute @${username}?`,
      description: `Their posts will appear in your feed again.`,
      confirmLabel: `Unmute @${username}`,
    },
    unfollow: {
      title: `Unfollow @${username}?`,
      description:
        "You'll no longer see private posts from this account. This action can be undone by following again.",
      confirmLabel: `Unfollow @${username}`,
    },
  };

  const followButtonLabel = followToggleMutation.isPending
    ? isPendingUnfollow
      ? "Unfollowing..."
      : isCancelFollowRequest
        ? "Canceling request..."
        : isPrivate
          ? "Requesting..."
          : "Following..."
    : isFollowing
      ? "Following"
      : isFollowRequested
        ? "Requested"
        : "Follow";

  const avatarClassName =
    "h-[88px] w-[88px] border-[4px] border-bg text-[28px] ring-0 shadow-none sm:h-[112px] sm:w-[112px] sm:text-[36px] md:h-[200px] md:w-[200px] md:text-[56px]";

  const actionButtons = isOwnProfile ? (
    <Button
      variant="secondary"
      size="sm"
      className="h-auto border border-border-strong bg-elevated px-5 py-2 text-[13px] font-bold text-fg shadow-none hover:border-fg-muted hover:bg-hover"
      onClick={() => setShowEditModal(true)}
    >
      Edit profile
    </Button>
  ) : (
    <>
      <Button variant="ghost" size="sm">Message</Button>
      {hasIncomingFollowRequestAction ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            disabled={isRespondingToIncomingFollowRequest || !isLoaded}
            onClick={() => {
              if (!isLoaded || isRespondingToIncomingFollowRequest) return;
              declineFollowRequestMutation.mutate();
            }}
          >
            {declineFollowRequestMutation.isPending ? "Ignoring..." : "Ignore"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={isRespondingToIncomingFollowRequest || !isLoaded}
            onClick={() => {
              if (!isLoaded || isRespondingToIncomingFollowRequest) return;
              acceptFollowRequestMutation.mutate();
            }}
          >
            {acceptFollowRequestMutation.isPending ? "Accepting..." : "Accept"}
          </Button>
        </>
      ) : showFollowButton ? (
        <Button
          variant={isFollowing ? "secondary" : "primary"}
          size="sm"
          disabled={followToggleMutation.isPending}
          onClick={() => {
            if (followToggleMutation.isPending) return;
            if (isFollowing && isPrivate) {
              setConfirmAction("unfollow");
              return;
            }
            followToggleMutation.mutate({
              userId,
              isFollowing,
              isFollowRequested,
            });
          }}
        >
          {followButtonLabel}
        </Button>
      ) : null}
      <PortalDropdown
        align="end"
        menuLabel="Profile actions"
        items={[
          {
            id: "share",
            label: "Share profile",
            icon: <Icon name="share-2" className="w-4 h-4" />,
            onSelect: () => setShowShareModal(true),
          },
          {
            id: "add-to-list",
            label: "Add to list",
            icon: <UserPlus className="w-4 h-4" strokeWidth={1.8} />,
          },
          {
            id: "mute",
            label: isMutedByViewer ? `Unmute @${username}` : `Mute @${username}`,
            icon: <VolumeX className="w-4 h-4" strokeWidth={1.8} />,
            onSelect: () => setConfirmAction(isMutedByViewer ? "unmute" : "mute"),
          },
          {
            id: "block",
            label: `Block @${username}`,
            icon: <CircleSlash className="w-4 h-4" strokeWidth={1.8} />,
            danger: true,
            onSelect: () => setConfirmAction("block"),
          },
          {
            id: "report",
            label: "Report",
            icon: <Flag className="w-4 h-4" strokeWidth={1.8} />,
            danger: true,
            onSelect: () => setConfirmAction("report"),
          },
        ]}
        trigger={({ ref, toggle, onKeyDown, isOpen, menuId }) => (
          <Button
            ref={ref}
            variant="secondary"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            onKeyDown={onKeyDown}
            aria-label="More options"
            aria-expanded={isOpen}
            aria-controls={menuId}
            aria-haspopup="menu"
            title="More"
          >
            <MoreVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
          </Button>
        )}
      />
    </>
  );

  return (
    <div className="ProfileHeader md:border-b md:border-border">
      <div className="relative overflow-visible bg-bg px-5 pb-4 sm:px-6 md:px-8 md:pb-6">
        <div className="absolute -top-11 left-5 z-10 sm:-top-14 sm:left-6 md:-top-[100px] md:left-8">
          {isOwnProfile ? (
            <ProfilePictureUpload onUploadComplete={handleAvatarChange}>
              <Avatar
                initial={profileData.displayName[0]}
                src={profileImage}
                size="profile-lg"
                className={avatarClassName}
              />
            </ProfilePictureUpload>
          ) : (
            <button
              type="button"
              onClick={() => setShowAvatarViewer(true)}
              className="cursor-pointer rounded-full border-none bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={"View " + profileData.displayName + "'s profile photo"}
            >
              <Avatar
                initial={profileData.displayName[0]}
                src={profileImage}
                size="profile-lg"
                className={avatarClassName}
              />
            </button>
          )}
        </div>

        <div className="flex min-h-[2.75rem] items-center justify-end gap-2 sm:min-h-[3rem] md:min-h-[3.5rem] md:justify-between">
          <div className="hidden min-w-0 flex-1 items-center md:flex">
            <div className="w-[200px] shrink-0" aria-hidden />

            <ProfileStats
              username={profileData.username}
              displayName={profileData.displayName}
              followerCount={followerCount}
              followingCount={followingCount}
              filmsLoggedCount={filmsLoggedCount}
              isOwnProfile={isOwnProfile}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 pl-[calc(88px+0.75rem)] sm:pl-[calc(112px+1rem)] md:pl-0">
            {actionButtons}
          </div>
        </div>
      </div>

      {confirmAction && (
        <ConfirmDialog
          open={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction === "block") {
              blockMutation.mutate({ userId, blocked: false });
            } else if (confirmAction === "mute") {
              muteMutation.mutate(
                { userId, muted: false },
                {
                  onSuccess: () => setIsMutedByViewer(true),
                }
              );
            } else if (confirmAction === "unfollow") {
              followToggleMutation.mutate({
                userId,
                isFollowing,
                isFollowRequested,
              });
            } else if (confirmAction === "unmute") {
              muteMutation.mutate(
                { userId, muted: true },
                {
                  onSuccess: () => setIsMutedByViewer(false),
                }
              );
            }
            setConfirmAction(null);
          }}
          title={confirmConfig[confirmAction].title}
          description={confirmConfig[confirmAction].description}
          confirmLabel={confirmConfig[confirmAction].confirmLabel}
          cancelLabel="Cancel"
          variant={confirmAction === "block" || confirmAction === "report" ? "danger" : "default"}
        />
      )}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={typeof window !== "undefined" ? `${window.location.origin}/${profileData.username}` : ""}
        title={`${profileData.displayName} (@${profileData.username}) on 35mm`}
        previewContent={{
          type: "user",
          title: profileData.displayName,
          description: profileData.bio,
          image: profileImage || undefined,
        }}
      />

      <EditProfileModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        initialData={{
          displayName: profileData.displayName,
          dateOfBirth: profileData.dateOfBirth,
          bio: profileData.bio,
          location: profileData.location,
          website: profileData.website,
        }}
        onSave={(next) => {
          setProfileData((prev) => ({ ...prev, ...next }));
        }}
      />

      <AvatarViewer
        open={showAvatarViewer}
        onClose={() => setShowAvatarViewer(false)}
        src={profileImage}
        initial={profileData.displayName[0]}
        displayName={profileData.displayName}
      />

    </div>
  );
}
