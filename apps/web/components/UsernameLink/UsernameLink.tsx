"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/formatCount";
import { formatRoleContextSegment } from "@/lib/utils/userRoleHeadline";
import {
  fetchPublicProfile,
  type PublicProfile,
} from "@/features/profile/api/profileApi";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { profileKeys } from "@/features/profile/hooks/queryKeys";
import { useFollowToggle, useMuteUserMutation, usePublicProfile } from "@/features/profile/hooks/useProfile";

const PROFILE_POPOVER_SHOW_DELAY_MS = 520;
const PROFILE_POPOVER_SCROLL_SUPPRESS_MS = 650;

let lastProfilePopoverScrollAt = 0;
let scrollGuardRefCount = 0;

function markProfilePopoverScroll() {
  lastProfilePopoverScrollAt = Date.now();
}

function isProfilePopoverScrollSuppressed() {
  return Date.now() - lastProfilePopoverScrollAt < PROFILE_POPOVER_SCROLL_SUPPRESS_MS;
}

function subscribeProfilePopoverScrollGuard() {
  if (typeof window === "undefined") return () => {};

  scrollGuardRefCount += 1;

  if (scrollGuardRefCount === 1) {
    window.addEventListener("scroll", markProfilePopoverScroll, true);
    window.addEventListener("wheel", markProfilePopoverScroll, { capture: true, passive: true });
    window.addEventListener("touchmove", markProfilePopoverScroll, { capture: true, passive: true });
  }

  return () => {
    scrollGuardRefCount = Math.max(0, scrollGuardRefCount - 1);

    if (scrollGuardRefCount === 0) {
      window.removeEventListener("scroll", markProfilePopoverScroll, true);
      window.removeEventListener("wheel", markProfilePopoverScroll, true);
      window.removeEventListener("touchmove", markProfilePopoverScroll, true);
    }
  };
}

function resolvePopoverHeadline(
  profile: PublicProfile | null | undefined,
  fallback: {
    headline?: string;
    role?: string;
    roleContext?: string | null;
  }
): string | null {
  const customHeadline = (profile?.headline ?? fallback.headline)?.trim() ?? "";
  if (customHeadline.length > 0) {
    const context = profile?.headlineContext?.trim() ?? "";
    return context.length > 0 ? customHeadline + " · " + context : customHeadline;
  }

  const role = (profile?.role ?? fallback.role)?.trim() ?? "";
  if (role.length === 0) {
    return null;
  }

  const context = formatRoleContextSegment(role, {
    roleContext: profile?.roleContext ?? fallback.roleContext,
    filmsLoggedCount: profile?.filmsLoggedCount,
  });

  return context ? role + " · " + context : role;
}

function ProfilePopoverStat(props: { value?: number; label: string }) {
  if (typeof props.value !== "number") {
    return null;
  }

  return (
    <div>
      <span className="font-bold text-neutral-950">{formatCount(props.value)}</span>{" "}
      {props.label}
    </div>
  );
}

function ProfilePopover(props: {
  username: string;
  linkHref: string;
  position: { top: number; left: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  fallback: {
    displayName?: string;
    role?: string;
    roleContext?: string | null;
    headline?: string;
    bio?: string;
    avatarUrl?: string | null;
    initial?: string;
    followersCount?: number;
    followingCount?: number;
    filmsLoggedCount?: number;
  };
}) {
  const profileQuery = usePublicProfile(props.username);
  const profile = profileQuery.data;
  const currentUserQuery = useCurrentUserProfile();
  const followToggle = useFollowToggle(props.username);
  const muteMutation = useMuteUserMutation();

  const isOwnProfile =
    Boolean(currentUserQuery.data?.username) &&
    currentUserQuery.data?.username === props.username;

  const label = profile?.displayName ?? props.fallback.displayName ?? props.username;
  const avatarInitial =
    props.fallback.initial ?? props.username.charAt(0).toUpperCase();
  const resolvedAvatarUrl = profile?.avatarUrl ?? props.fallback.avatarUrl ?? null;
  const resolvedHeadline = resolvePopoverHeadline(profile, props.fallback);
  const bioText = profile?.bio ?? props.fallback.bio ?? null;
  const followersCount = profile?.followerCount ?? props.fallback.followersCount;
  const followingCount = profile?.followingCount ?? props.fallback.followingCount;
  const filmsLoggedCount = profile?.filmsLoggedCount ?? props.fallback.filmsLoggedCount;
  const coverUrl = profile?.coverUrl ?? null;

  const followLabel = followToggle.isPending
    ? "..."
    : profile?.isFollowing
      ? "Following"
      : profile?.isFollowRequested
        ? "Requested"
        : "Follow";

  const muteLabel = muteMutation.isPending
    ? "..."
    : profile?.isMutedByViewer
      ? "Unmute"
      : "Mute";

  return (
    <div
      className="fixed z-[200] w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-lg border border-black/10 bg-white text-neutral-950 shadow-[0_18px_48px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.09)]"
      style={{ top: props.position.top, left: props.position.left }}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      <div className="relative h-16 bg-[linear-gradient(135deg,#050505_0%,#171717_58%,#2f2f2f_100%)]">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            className="object-cover"
            sizes="300px"
          />
        ) : null}
      </div>
      <div className="px-3.5 pb-3.5">
        <div className="-mt-8 flex items-start gap-2.5">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-neutral-200 ring-[3px] ring-white">
            <Avatar
              initial={avatarInitial}
              src={resolvedAvatarUrl}
              className="h-16 w-16 text-xl ring-0"
            />
          </div>
          <div className="min-w-0 flex-1 pt-9">
            <div className="truncate text-[16px] font-bold leading-tight text-neutral-950">
              {label}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-neutral-500">
              @{props.username}
            </div>
          </div>
        </div>
        {resolvedHeadline ? (
          <div className="mt-2.5 text-[12.5px] font-semibold leading-snug text-neutral-900">
            {resolvedHeadline}
          </div>
        ) : null}
        {bioText ? (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.4] text-neutral-600">
            {bioText}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] leading-none text-neutral-600">
          <ProfilePopoverStat value={filmsLoggedCount} label="films" />
          <ProfilePopoverStat value={followersCount} label="followers" />
          <ProfilePopoverStat value={followingCount} label="following" />
        </div>
        <div className={cn("mt-3 grid gap-2", isOwnProfile ? "grid-cols-1" : "grid-cols-3")}>
          {!isOwnProfile && profile?.userId ? (
            <>
              <button
                type="button"
                disabled={followToggle.isPending}
                onClick={function () {
                  if (followToggle.isPending || !profile?.userId) return;
                  followToggle.mutate({
                    userId: profile.userId,
                    isFollowing: Boolean(profile.isFollowing),
                    isFollowRequested: Boolean(profile.isFollowRequested),
                  });
                }}
                className={cn(
                  "h-8 rounded-md border px-2 text-center text-[11px] font-bold transition-colors disabled:opacity-60",
                  profile.isFollowing || profile.isFollowRequested
                    ? "border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-100"
                    : "border-black bg-black text-white hover:opacity-85"
                )}
              >
                {followLabel}
              </button>
              <button
                type="button"
                disabled={muteMutation.isPending}
                onClick={function () {
                  if (muteMutation.isPending || !profile?.userId) return;
                  muteMutation.mutate({
                    userId: profile.userId,
                    muted: Boolean(profile.isMutedByViewer),
                  });
                }}
                className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-center text-[11px] font-bold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-60"
              >
                {muteLabel}
              </button>
            </>
          ) : null}
          <Link
            href={props.linkHref}
            className={cn(
              "flex h-8 items-center justify-center rounded-md border border-black bg-white px-2 text-center text-[11px] font-bold text-black no-underline transition-colors hover:bg-neutral-100",
              isOwnProfile ? "col-span-1" : "col-span-1"
            )}
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

export interface UsernameLinkProps {
  username: string;
  /** Display name shown in link/popover (defaults to username) */
  displayName?: string;
  /** Role/subtitle for popover e.g. "Editor · Budapest" */
  role?: string;
  roleContext?: string | null;
  /** Profile headline shown in the hover card. Falls back to role/context. */
  headline?: string;
  bio?: string;
  avatarUrl?: string | null;
  /** Avatar initial (defaults to first letter of username) */
  initial?: string;
  avatarBg?: string;
  avatarColor?: string;
  /** @deprecated Popover loads films logged from the profile API. */
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  filmsLoggedCount?: number;
  href?: string;
  className?: string;
  /** Use span instead of link (for inline text like reply author) */
  asSpan?: boolean;
  children?: React.ReactNode;
}

export function UsernameLink({
  username,
  displayName,
  role,
  roleContext,
  headline,
  bio,
  avatarUrl,
  initial,
  href,
  className,
  asSpan,
  children,
  followersCount,
  followingCount,
  filmsLoggedCount,
}: UsernameLinkProps) {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLAnchorElement | HTMLSpanElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringTrigger = useRef(false);

  useEffect(() => subscribeProfilePopoverScrollGuard(), []);

  const prefetchProfile = useCallback(function () {
    if (!isLoaded || username.trim().length === 0) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: profileKeys.detail(username),
      queryFn: async function () {
        return fetchPublicProfile(username, await getToken());
      },
      staleTime: 60_000,
    });
  }, [getToken, isLoaded, queryClient, username]);

  const show = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    const el = triggerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const popoverH = 315;
      const popoverW = 300;
      let top = rect.bottom + 6;
      let left = rect.left;
      if (top + popoverH > window.innerHeight - 8) top = rect.top - popoverH - 6;
      if (left + popoverW > window.innerWidth - 12) left = window.innerWidth - popoverW - 12;
      if (left < 12) left = 12;
      setPos({ top, left });
    }
    setVisible(true);
  }, []);

  const clearShowTimeout = useCallback(() => {
    if (showTimeout.current) {
      clearTimeout(showTimeout.current);
      showTimeout.current = null;
    }
  }, []);

  const scheduleShow = useCallback(() => {
    isHoveringTrigger.current = true;

    if (isProfilePopoverScrollSuppressed()) {
      return;
    }

    prefetchProfile();
    clearShowTimeout();
    showTimeout.current = setTimeout(() => {
      showTimeout.current = null;

      if (!isHoveringTrigger.current || isProfilePopoverScrollSuppressed()) {
        return;
      }

      show();
    }, PROFILE_POPOVER_SHOW_DELAY_MS);
  }, [clearShowTimeout, prefetchProfile, show]);

  const hide = useCallback(() => {
    isHoveringTrigger.current = false;
    clearShowTimeout();
    hideTimeout.current = setTimeout(() => setVisible(false), 80);
  }, [clearShowTimeout]);

  const cancelHide = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    const closeOnScroll = () => {
      clearShowTimeout();
      setVisible(false);
    };

    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("wheel", closeOnScroll, { capture: true, passive: true });
    window.addEventListener("touchmove", closeOnScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("wheel", closeOnScroll, true);
      window.removeEventListener("touchmove", closeOnScroll, true);
    };
  }, [clearShowTimeout, visible]);

  useEffect(() => {
    return () => {
      clearShowTimeout();
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
    };
  }, [clearShowTimeout]);

  const label = displayName ?? username;
  const linkHref = href ?? ROUTES.PROFILE(username);

  const triggerProps = {
    ref: triggerRef as React.RefObject<HTMLAnchorElement & HTMLSpanElement>,
    onMouseEnter: scheduleShow,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
    className: cn(className),
  };

  const content = children ?? label;

  const trigger = asSpan ? (
    <span {...triggerProps}>{content}</span>
  ) : (
    <Link href={linkHref} {...triggerProps}>
      {content}
    </Link>
  );

  const popover =
    visible && typeof document !== "undefined"
      ? createPortal(
          <ProfilePopover
            username={username}
            linkHref={linkHref}
            position={pos}
            onMouseEnter={cancelHide}
            onMouseLeave={hide}
            fallback={{
              displayName,
              role,
              roleContext,
              headline,
              bio,
              avatarUrl,
              initial,
              followersCount,
              followingCount,
              filmsLoggedCount,
            }}
          />,
          document.body
        )
      : null;

  return (
    <>
      {trigger}
      {popover}
    </>
  );
}
