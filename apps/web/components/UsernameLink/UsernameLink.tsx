"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/formatCount";

const PROFILE_POPOVER_SHOW_DELAY_MS = 520;
const PROFILE_POPOVER_SCROLL_SUPPRESS_MS = 650;

let lastProfilePopoverScrollAt = 0;
let scrollGuardRefCount = 0;

function getUsernameSeed(username: string) {
  return Array.from(username).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

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
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
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
  avatarBg,
  avatarColor,
  postsCount,
  followersCount,
  followingCount,
  href,
  className,
  asSpan,
  children,
}: UsernameLinkProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLAnchorElement | HTMLSpanElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringTrigger = useRef(false);

  useEffect(() => subscribeProfilePopoverScrollGuard(), []);

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

    clearShowTimeout();
    showTimeout.current = setTimeout(() => {
      showTimeout.current = null;

      if (!isHoveringTrigger.current || isProfilePopoverScrollSuppressed()) {
        return;
      }

      show();
    }, PROFILE_POPOVER_SHOW_DELAY_MS);
  }, [clearShowTimeout, show]);

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
  const avatarInitial = initial ?? username.charAt(0).toUpperCase();
  const linkHref = href ?? ROUTES.PROFILE(username);
  const roleHeadline = [role, roleContext]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join(" · ");
  const usernameSeed = getUsernameSeed(username);
  const resolvedHeadline = headline ?? roleHeadline;
  const resolvedBio =
    bio ??
    "Sharing film notes, discoveries, and work from the 35mm community.";
  const resolvedPostsCount = postsCount ?? 12 + (usernameSeed % 280);
  const resolvedFollowersCount = followersCount ?? 90 + ((usernameSeed * 7) % 2400);
  const resolvedFollowingCount = followingCount ?? 20 + ((usernameSeed * 13) % 700);

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

  const popover = visible && typeof document !== "undefined"
    ? createPortal(
        <div
          className="fixed z-[200] w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-lg border border-black/10 bg-white text-neutral-950 shadow-[0_18px_48px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.09)]"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={cancelHide}
          onMouseLeave={hide}
        >
          <div className="h-16 bg-[linear-gradient(135deg,#050505_0%,#171717_58%,#2f2f2f_100%)]" />
          <div className="px-3.5 pb-3.5">
            <div className="-mt-8 flex items-start gap-2.5">
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-neutral-200 ring-[3px] ring-white">
                <Avatar
                  initial={avatarInitial}
                  src={avatarUrl}
                  className="h-16 w-16 text-xl ring-0"
                />
              </div>
              <div className="min-w-0 flex-1 pt-9">
                <div className="truncate text-[16px] font-bold leading-tight text-neutral-950">
                  {label}
                </div>
                <div className="mt-0.5 truncate text-[12px] text-neutral-500">
                  @{username}
                </div>
              </div>
            </div>
            {resolvedHeadline ? (
              <div className="mt-2.5 text-[12.5px] font-semibold leading-snug text-neutral-900">
                {resolvedHeadline}
              </div>
            ) : null}
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.4] text-neutral-600">
              {resolvedBio}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] leading-none text-neutral-600">
              <div>
                <span className="font-bold text-neutral-950">{formatCount(resolvedPostsCount)}</span>{" "}
                posts
              </div>
              <div>
                <span className="font-bold text-neutral-950">{formatCount(resolvedFollowersCount)}</span>{" "}
                followers
              </div>
              <div>
                <span className="font-bold text-neutral-950">{formatCount(resolvedFollowingCount)}</span>{" "}
                following
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="h-8 rounded-md border border-black bg-black px-3 text-center text-[12px] font-bold text-white transition-opacity hover:opacity-85"
              >
                Follow
              </button>
              <Link
                href={linkHref}
                className="flex h-8 items-center justify-center rounded-md border border-black bg-white px-3 text-center text-[12px] font-bold text-black no-underline transition-colors hover:bg-neutral-100"
              >
                View Profile
              </Link>
            </div>
          </div>
        </div>,
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
