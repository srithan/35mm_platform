"use client";

import { useEffect, useState } from "react";
import { MoreVertical, UserPlus, VolumeX, CircleSlash, Flag } from "lucide-react";
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
import { useBlockUserMutation, useFollowToggle, useMuteUserMutation } from "../hooks/useProfile";

interface ProfileHeaderProps {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  isOwnProfile?: boolean;
  isMutedByViewer?: boolean;
  location?: string;
  website?: string;
  dateOfBirth?: string | null;
  followerCount: number;
  followingCount: number;
  filmsLoggedCount: number;
  isFollowing: boolean;
  isFollowRequested?: boolean;
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
  avatarUrl: initialAvatarUrl = null,
  onAvatarUrlChange,
}: ProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isFollowRequested, setIsFollowRequested] = useState(initialIsFollowRequested);
  const [isMutedByViewer, setIsMutedByViewer] = useState(initialIsMutedByViewer);
  const [confirmAction, setConfirmAction] = useState<"block" | "report" | "mute" | "unmute" | null>(null);
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

  useEffect(() => {
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
    setIsFollowing(initialIsFollowing);
    setIsFollowRequested(initialIsFollowRequested);
  }, [initialIsFollowing, initialIsFollowRequested]);

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
  };

  return (
    <div className="ProfileHeader border-b border-border">
      <div className="relative overflow-visible bg-white">
        <div className="absolute bottom-0 left-5 z-10 translate-y-[22%] sm:left-6 md:left-8">
          {isOwnProfile ? (
            <ProfilePictureUpload onUploadComplete={handleAvatarChange}>
              <Avatar
                initial={profileData.displayName[0]}
                src={profileImage}
                size="profile-lg"
                variant="ring"
                className="h-[200px] w-[200px] border-[4px] border-white text-[56px] shadow-sm"
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
                variant="ring"
                className="h-[200px] w-[200px] border-[4px] border-white text-[56px] shadow-sm"
              />
            </button>
          )}
        </div>

        <div className="flex h-[3.5rem] items-center gap-2 px-5 sm:gap-3 sm:px-6 md:px-8">
          <div className="w-[200px] shrink-0" aria-hidden />

          <ProfileStats
            username={profileData.username}
            displayName={profileData.displayName}
            followerCount={followerCount}
            followingCount={followingCount}
            filmsLoggedCount={filmsLoggedCount}
            isOwnProfile={isOwnProfile}
          />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {isOwnProfile ? (
            <Button
              variant="secondary"
              size="sm"
              className="h-auto border border-border-strong bg-white px-5 py-2 text-[13px] font-bold text-fg shadow-none hover:border-fg-muted hover:bg-[#fafafa]"
              onClick={() => setShowEditModal(true)}
            >
              Edit profile
            </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm">Message</Button>
                <Button
                  variant={isFollowing ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => {
                    if (followToggleMutation.isPending) return;
                    followToggleMutation.mutate({
                      userId,
                      isFollowing,
                      isFollowRequested,
                    });
                  }}
                >
                  {followToggleMutation.isPending
                    ? "..."
                    : isFollowing
                      ? "Following"
                      : isFollowRequested
                        ? "Requested"
                        : "Follow"}
                </Button>
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
            )}
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
