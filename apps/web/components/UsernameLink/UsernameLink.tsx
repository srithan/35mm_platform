"use client";

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/formatCount";
import { ProfileRoleHeadlinePill } from "@/lib/utils/userRoleHeadline";
import { fetchPublicProfile } from "@/features/profile/api/profileApi";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { profileKeys } from "@/features/profile/hooks/queryKeys";
import { useFollowToggle, usePublicProfile } from "@/features/profile/hooks/useProfile";

const PROFILE_POPOVER_SHOW_DELAY_MS = 520;
const PROFILE_POPOVER_SCROLL_SUPPRESS_MS = 650;
const PROFILE_POPOVER_OFFSET_PX = 6;
const PROFILE_POPOVER_VIEWPORT_PADDING_X = 12;
const PROFILE_POPOVER_VIEWPORT_PADDING_Y = 8;
const PROFILE_POPOVER_DEFAULT_WIDTH = 320;
const PROFILE_POPOVER_DEFAULT_HEIGHT = 288;

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

function getPopoverPosition(
  triggerRect: DOMRect,
  popoverWidth: number,
  popoverHeight: number
) {
  let top = triggerRect.bottom + PROFILE_POPOVER_OFFSET_PX;
  let left = triggerRect.left;

  if (top + popoverHeight > window.innerHeight - PROFILE_POPOVER_VIEWPORT_PADDING_Y) {
    top = triggerRect.top - popoverHeight - PROFILE_POPOVER_OFFSET_PX;
  }

  const maxTop = window.innerHeight - popoverHeight - PROFILE_POPOVER_VIEWPORT_PADDING_Y;
  if (top < PROFILE_POPOVER_VIEWPORT_PADDING_Y) {
    top = Math.max(PROFILE_POPOVER_VIEWPORT_PADDING_Y, maxTop);
  }

  if (left + popoverWidth > window.innerWidth - PROFILE_POPOVER_VIEWPORT_PADDING_X) {
    left = window.innerWidth - popoverWidth - PROFILE_POPOVER_VIEWPORT_PADDING_X;
  }
  if (left < PROFILE_POPOVER_VIEWPORT_PADDING_X) {
    left = PROFILE_POPOVER_VIEWPORT_PADDING_X;
  }

  return { top, left };
}

function ProfilePopoverStat(props: { value?: number; label: string }) {
  if (typeof props.value !== "number") {
    return null;
  }

  return (
    <span className="inline-flex items-baseline gap-1 text-[13px] leading-none">
      <span className="font-semibold tabular-nums text-fg">{formatCount(props.value)}</span>
      <span className="font-normal text-fg-muted">{props.label}</span>
    </span>
  );
}

function ProfilePopover(props: {
  username: string;
  linkHref: string;
  position: { top: number; left: number };
  containerRef?: React.Ref<HTMLDivElement>;
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

  const isOwnProfile =
    Boolean(currentUserQuery.data?.username) &&
    currentUserQuery.data?.username === props.username;

  const label = profile?.displayName ?? props.fallback.displayName ?? props.username;
  const avatarInitial =
    props.fallback.initial ?? props.username.charAt(0).toUpperCase();
  const resolvedAvatarUrl = profile?.avatarUrl ?? props.fallback.avatarUrl ?? null;
  const roleLabel = (
    profile?.role ??
    props.fallback.role ??
    profile?.headline ??
    props.fallback.headline
  )?.trim() ?? "";
  const roleContext =
    profile?.roleContext ??
    props.fallback.roleContext ??
    profile?.headlineContext ??
    null;
  const bioText = profile?.bio ?? props.fallback.bio ?? null;
  const followersCount = profile?.followerCount ?? props.fallback.followersCount;
  const followingCount = profile?.followingCount ?? props.fallback.followingCount;
  const filmsLoggedCount = profile?.filmsLoggedCount ?? props.fallback.filmsLoggedCount;
  const coverUrl = profile?.coverUrl ?? null;

  const isLoading = profileQuery.isLoading && !profile;
  const showFollowButton = !isOwnProfile;
  const followLabel = followToggle.isPending
    ? "..."
    : profile?.isFollowing
      ? "Following"
      : profile?.isFollowRequested
        ? "Requested"
        : "Follow";
  const followVariant =
    profile?.isFollowing || profile?.isFollowRequested ? "secondary" : "primary";

  return (
    <div
      ref={props.containerRef}
      className="fixed z-[200] w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-xl border border-border bg-bg text-fg shadow-[0_12px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.05)] animate-[fadeUp_0.15s_ease-out_both]"
      style={{ top: props.position.top, left: props.position.left }}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      <div className="relative h-[72px] bg-gradient-to-br from-[var(--color-poster-bg-from)] via-neutral-800 to-[var(--color-poster-bg-to)]">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            className="object-cover"
            sizes="320px"
          />
        ) : null}
      </div>
      <div className="px-4 pb-4">
        <div className="-mt-[26px] mb-2.5">
          <div className="inline-flex rounded-full ring-[3px] ring-bg">
            <Avatar
              initial={avatarInitial}
              src={resolvedAvatarUrl}
              className="h-[52px] w-[52px] text-lg ring-0"
            />
          </div>
        </div>
        <div className="min-w-0">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-skeleton" />
              <div className="h-3.5 w-24 rounded bg-skeleton" />
            </div>
          ) : (
            <>
              <div className="truncate text-[15px] font-bold leading-tight text-fg">
                {label}
              </div>
              <div className="mt-0.5 truncate text-[13px] text-fg-muted">
                @{props.username}
              </div>
            </>
          )}
        </div>
        {roleLabel.length > 0 ? (
          <ProfileRoleHeadlinePill
            role={roleLabel}
            roleContext={roleContext}
            filmsLoggedCount={filmsLoggedCount}
            className="mt-2.5"
          />
        ) : null}
        {bioText ? (
          <p className="mt-2.5 line-clamp-2 text-[13px] font-normal leading-[1.5] text-fg-muted">
            {bioText}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1">
          <ProfilePopoverStat value={followingCount} label="Following" />
          <ProfilePopoverStat value={followersCount} label="Followers" />
          <ProfilePopoverStat value={filmsLoggedCount} label="Films" />
        </div>
        <div className="mt-3.5 flex gap-2">
          {showFollowButton ? (
            <Button
              type="button"
              variant={followVariant}
              size="sm"
              disabled={followToggle.isPending || isLoading || !profile?.userId}
              onClick={function () {
                if (followToggle.isPending || !profile?.userId) return;
                followToggle.mutate({
                  userId: profile.userId,
                  isFollowing: Boolean(profile.isFollowing),
                  isFollowRequested: Boolean(profile.isFollowRequested),
                });
              }}
              className="h-8 min-w-0 flex-1 px-3 text-[12px] font-bold"
            >
              {followLabel}
            </Button>
          ) : null}
          <Link
            href={props.linkHref}
            className={cn(
              "flex h-8 min-w-0 items-center justify-center rounded-full border border-border px-3 text-center text-[12px] font-semibold text-fg no-underline transition-all duration-150 hover:border-fg-muted hover:bg-hover",
              showFollowButton ? "flex-1" : "w-full"
            )}
          >
            View profile
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
  const popoverRef = useRef<HTMLDivElement>(null);
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
      setPos(
        getPopoverPosition(
          rect,
          PROFILE_POPOVER_DEFAULT_WIDTH,
          PROFILE_POPOVER_DEFAULT_HEIGHT
        )
      );
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

  useLayoutEffect(() => {
    if (!visible) return;

    const trigger = triggerRef.current;
    const popoverEl = popoverRef.current;
    if (!trigger || !popoverEl) return;

    const reposition = () => {
      const triggerRect = trigger.getBoundingClientRect();
      const popoverRect = popoverEl.getBoundingClientRect();
      const nextPos = getPopoverPosition(triggerRect, popoverRect.width, popoverRect.height);
      setPos((current) => {
        if (current.top === nextPos.top && current.left === nextPos.left) return current;
        return nextPos;
      });
    };

    reposition();

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(reposition) : null;
    resizeObserver?.observe(popoverEl);
    window.addEventListener("resize", reposition, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", reposition);
    };
  }, [visible]);

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
            containerRef={popoverRef}
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
