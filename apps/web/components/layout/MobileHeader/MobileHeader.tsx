"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Search } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { BrandLogo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils/cn";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { syncSiteHeaderStickyOffset } from "@/lib/utils/syncSiteHeaderStickyOffset";

interface MobileHeaderProps {
  /** Called when profile picture is clicked (opens MobileSidebar) */
  onProfileClick?: () => void;
  /** Page title shown in center. If omitted, shows 35mm logo. */
  title?: string;
  /** Right-side slot (e.g. settings + compose buttons for chat) */
  rightSlot?: React.ReactNode;
  /** Hide bottom border when sticky tabs or search bar is directly below */
  hideBottomBorder?: boolean;
}

export function MobileHeader({
  onProfileClick,
  title,
  rightSlot,
  hideBottomBorder = false,
}: MobileHeaderProps) {
  const headerRef = useRef<HTMLElement | null>(null);
  const { user: clerkUser } = useUser();
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const displayName = currentUser?.displayName ?? clerkUser?.fullName ?? clerkUser?.username ?? "Profile";
  const avatarUrl = currentUser?.avatarUrl ?? clerkUser?.imageUrl ?? null;
  const suppressDefaultAvatar = !currentUser?.avatarUrl &&
    !clerkUser?.imageUrl &&
    (
      currentUserQuery.isPending ||
      currentUserQuery.isLoading ||
      currentUserQuery.isFetching ||
      currentUserQuery.fetchStatus !== "idle"
    );

  useLayoutEffect(function () {
    const el = headerRef.current;
    if (!el) return;

    function syncStickyOffset() {
      syncSiteHeaderStickyOffset();
    }

    syncStickyOffset();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncStickyOffset) : null;
    ro?.observe(el);
    const mq = window.matchMedia("(min-width: 768px)");
    mq.addEventListener("change", syncStickyOffset);
    return function () {
      ro?.disconnect();
      mq.removeEventListener("change", syncStickyOffset);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      id="mobile-site-nav"
      className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-50 min-h-14 py-3 pl-4 pr-[calc(1rem+var(--app-scrollbar-gutter,0px))] grid grid-cols-[auto_1fr_auto] items-center gap-2 bg-bg/95 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))]",
        !hideBottomBorder && "border-b border-border"
      )}
      role="banner"
    >
      <button
        type="button"
        onClick={onProfileClick}
        className="flex items-center justify-center w-10 h-10 -ml-1 rounded-full active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label="Open menu"
      >
        <Avatar
          initial={initialForName(displayName)}
          src={avatarUrl}
          size="md"
          variant="ring"
          allowDefaultFallback={!suppressDefaultAvatar}
        />
      </button>

      <div className="min-w-0 flex justify-center overflow-hidden">
        {title ? (
          <h1 className="font-semibold text-[17px] text-fg truncate">
            {title}
          </h1>
        ) : (
          <BrandLogo
            href={ROUTES.HOME}
            className="px-3 py-1 shrink-0 text-[20.5px] font-semibold tracking-wide text-fg"
          >
            35<span className="text-accent">mm</span>
          </BrandLogo>
        )}
      </div>

      <div className="min-w-10 flex items-center justify-end gap-1 shrink-0">
        {rightSlot}
        <Link
          href={ROUTES.DISCOVER}
          className="flex h-10 w-10 items-center justify-center rounded-full text-fg active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-label="Search"
        >
          <Search className="h-[22px] w-[22px]" strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}
