"use client";

import { useEffect, useState } from "react";
import { MapPin, Link2, Calendar, MoreVertical, UserPlus, VolumeX, CircleSlash, Flag, Lock } from "lucide-react";
import { Icon } from "@/components/Icon/Icon";
import { Button } from "@/components/Button";
import { PortalDropdown } from "@/components/PortalDropdown/PortalDropdown";
import { Avatar } from "@/components/Avatar/Avatar";
import { AvatarViewer } from "@/components/Avatar/AvatarViewer";
import { ProfilePictureUpload } from "./ProfilePictureUpload";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { ShareModal } from "@/components/ShareModal/ShareModal";
import { formatCount } from "@/lib/utils/formatCount";
import { EditProfileModal } from "./EditProfileModal";
import { ProfileConnectionsModal } from "./ProfileConnectionsModal";
import { useBlockUserMutation, useFollowToggle, useMuteUserMutation } from "../hooks/useProfile";
import { UserRoleHeadline } from "@/lib/utils/userRoleHeadline";

function websiteHref(raw: string): string {
  const t = raw.trim();
  if (t.length === 0) {
    return "#";
  }
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  return "https://" + t;
}

interface ProfileHeaderProps {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  isOwnProfile?: boolean;
  location?: string;
  website?: string;
  dateOfBirth?: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollowRequested?: boolean;
  isPrivate?: boolean;
  role?: string | null;
  roleContext?: string | null;
  headline?: string | null;
  headlineContext?: string | null;
  avatarUrl?: string | null;
  onAvatarUrlChange?: (imageUrl: string | null) => void;
}

export function ProfileHeader({
  userId,
  username,
  displayName: initialDisplayName,
  bio: initialBio,
  isOwnProfile = false,
  location: initialLocation = "",
  website: initialWebsite = "",
  dateOfBirth: initialDateOfBirth = "",
  followerCount,
  followingCount,
  isFollowing: initialIsFollowing,
  isFollowRequested: initialIsFollowRequested = false,
  isPrivate = false,
  role = null,
  roleContext = null,
  headline = null,
  headlineContext = null,
  avatarUrl: initialAvatarUrl = null,
  onAvatarUrlChange,
}: ProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isFollowRequested, setIsFollowRequested] = useState(initialIsFollowRequested);
  const [confirmAction, setConfirmAction] = useState<"block" | "report" | "mute" | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(initialAvatarUrl);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionsKind, setConnectionsKind] = useState<
    "followers" | "following"
  >("followers");
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

  const handleAvatarChange = (imageUrl: string | null) => {
    setProfileImage(imageUrl);
    onAvatarUrlChange?.(imageUrl);
  };
  const statItemClass =
    "cursor-pointer rounded-lg border border-border bg-bg px-3.5 py-2 text-left font-inherit shadow-[0_1px_0_rgb(15_23_42/4%)] transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const metaItemClass =
    "inline-flex h-8 max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-sunken px-2.5 text-[12.5px] font-medium text-fg-muted";
  const metaLinkClass =
    metaItemClass +
    " no-underline transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

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
  };

  return (
    <div className="relative mt-3 sm:mt-4 pb-6 border-b border-border md:px-5 sm:px-6 md:px-8">
      <div className="absolute left-0 z-10" style={{ top: "-3.875rem" }}>
        {isOwnProfile ? (
          <ProfilePictureUpload onUploadComplete={handleAvatarChange}>
            <Avatar
              initial={profileData.displayName[0]}
              src={profileImage}
              size="profile-lg"
              variant="ring"
              className="w-[126px] h-[126px] text-[32px] md:w-[134px] md:h-[134px] md:text-[34px] border-[4px] border-bg shadow-sm"
            />
          </ProfilePictureUpload>
        ) : (
          <button
            type="button"
            onClick={() => setShowAvatarViewer(true)}
            className="cursor-pointer border-none bg-transparent p-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={"View " + profileData.displayName + "'s profile photo"}
          >
            <Avatar
              initial={profileData.displayName[0]}
              src={profileImage}
              size="profile-lg"
              variant="ring"
              className="w-[126px] h-[126px] text-[32px] md:w-[134px] md:h-[134px] md:text-[34px] border-[4px] border-bg shadow-sm"
            />
          </button>
        )}
      </div>

      <div className="absolute right-0 top-1 z-20 flex flex-shrink-0 gap-2 justify-end">
        {isOwnProfile ? (
          <Button variant="primary" size="sm" onClick={() => setShowEditModal(true)}>
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
                  label: `Mute @${username}`,
                  icon: <VolumeX className="w-4 h-4" strokeWidth={1.8} />,
                  onSelect: () => setConfirmAction("mute"),
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

      <div className="pt-[4.5rem] sm:pt-[4.625rem] md:pt-[5.125rem] lg:pr-48">
        <div className="text-[26px] font-semibold leading-[1.08] text-fg md:text-[28px]">
          {profileData.displayName}
          {isPrivate ? (
            <span className="ml-2 inline-flex align-middle text-fg-muted" aria-label="Private account">
              <Lock className="h-5 w-5" strokeWidth={1.8} />
            </span>
          ) : null}
        </div>
        <div className="mt-2 inline-flex w-fit items-center rounded-full border border-border bg-sunken px-2.5 py-1 text-[12.5px] font-medium leading-none text-fg-muted">
          @{profileData.username}
        </div>
        {headline && headline.trim().length > 0 ? (
          <div className="mt-2.5 inline-flex w-fit items-center rounded-full border border-border bg-sunken px-2.5 py-1 text-[12px] font-medium leading-none text-fg-muted">
            {headline.trim()}
            {headlineContext && headlineContext.trim().length > 0 ? ` · ${headlineContext.trim()}` : ""}
          </div>
        ) : role && role.trim().length > 0 ? (
          <div className="mt-2.5">
            <UserRoleHeadline
              role={role.trim()}
              roleContext={roleContext}
              textClassName="text-[12px]"
            />
          </div>
        ) : null}
        <p className="mt-4 max-w-[650px] text-[15px] leading-[1.6] text-fg">
          {profileData.bio}
        </p>
        <div className="mt-3 flex max-w-[720px] flex-wrap gap-2.5">
          {profileData.location.trim().length > 0 ? (
            <span className={metaItemClass}>
              <MapPin className="h-[14px] w-[14px] shrink-0 text-fg-faint" strokeWidth={1.7} />
              {profileData.location}
            </span>
          ) : null}
          {profileData.website.trim().length > 0 ? (
            <a
              href={websiteHref(profileData.website)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={"Visit " + profileData.website + " (opens in new tab)"}
              className={metaLinkClass}
            >
              <Link2 className="h-[14px] w-[14px] shrink-0 text-fg-faint" strokeWidth={1.7} aria-hidden />
              <span className="min-w-0 truncate">{profileData.website}</span>
            </a>
          ) : null}
          <span className={metaItemClass}>
            <Calendar className="h-[14px] w-[14px] shrink-0 text-fg-faint" strokeWidth={1.7} />
            Joined Feb 2024
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            className={statItemClass}
            onClick={() => {
              setConnectionsKind("following");
              setConnectionsOpen(true);
            }}
          >
            <span className="block text-[17px] font-semibold leading-none text-fg">{formatCount(followingCount)}</span>
            <span className="mt-1 block text-[11.5px] font-medium text-fg-muted">following</span>
          </button>
          <button
            type="button"
            className={statItemClass}
            onClick={() => {
              setConnectionsKind("followers");
              setConnectionsOpen(true);
            }}
          >
            <span className="block text-[17px] font-semibold leading-none text-fg">{formatCount(followerCount)}</span>
            <span className="mt-1 block text-[11.5px] font-medium text-fg-muted">followers</span>
          </button>
          <div className="rounded-lg border border-border bg-bg px-3.5 py-2 text-left shadow-[0_1px_0_rgb(15_23_42/4%)]">
            <span className="block text-[17px] font-semibold leading-none text-fg">642</span>
            <span className="mt-1 block text-[11.5px] font-medium text-fg-muted">films logged</span>
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
              muteMutation.mutate({ userId, muted: false });
            }
            setConfirmAction(null);
          }}
          title={confirmConfig[confirmAction].title}
          description={confirmConfig[confirmAction].description}
          confirmLabel={confirmConfig[confirmAction].confirmLabel}
          cancelLabel="Cancel"
          variant="danger"
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

      <ProfileConnectionsModal
        open={connectionsOpen}
        onClose={() => setConnectionsOpen(false)}
        username={profileData.username}
        kind={connectionsKind}
        isOwnProfile={isOwnProfile}
        displayName={profileData.displayName}
        followerCount={followerCount}
        followingCount={followingCount}
      />
    </div>
  );
}
