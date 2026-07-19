"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import {
  CalendarDays,
  CircleHelp,
  FileText,
  SquareStack,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Icon, type IconName } from "@/components/Icon/Icon";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { isRouteActive } from "@/lib/utils/navigation";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";

interface MobileSidebarItem {
  label: string;
  href: string;
  icon: IconName | LucideIcon;
}

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

function MobileSidebarSection({
  items,
  onClose,
  isActive,
  size = "regular",
}: {
  items: readonly MobileSidebarItem[];
  onClose: () => void;
  isActive: (href: string) => boolean;
  size?: "regular" | "compact";
}) {
  const regular = size === "regular";
  return (
    <div>
      {items.map((item) => {
        const active = isActive(item.href);
        const SidebarIcon = item.icon;
        return (
          <Link
            key={item.label + ":" + item.href}
            href={item.href}
            onClick={onClose}
            data-active={active}
            aria-current={active ? "page" : undefined}
            className={cn(
              "ios-sidebar-font -mx-2 flex items-center gap-[18px] rounded-xl px-2 text-fg no-underline",
              "transition-[background-color,opacity] hover:bg-sunken/70 active:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/15",
              regular ? "h-[50px] text-[19px] font-black" : "h-11 text-base font-black"
            )}
          >
            <span className="flex w-[30px] shrink-0 items-center justify-center" aria-hidden>
              {typeof SidebarIcon === "string" ? (
                <Icon
                  name={SidebarIcon}
                  className={regular ? "h-[21px] w-[21px]" : "h-[18px] w-[18px]"}
                  strokeWidth={2}
                />
              ) : (
                <SidebarIcon
                  className={regular ? "h-[21px] w-[21px]" : "h-[18px] w-[18px]"}
                  strokeWidth={2.15}
                />
              )}
            </span>
            <span className="min-w-0 truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const sidebarRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const { user: clerkUser } = useUser();
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const profileUsername = currentUser?.username ?? clerkUser?.username ?? null;
  const profileHref = profileUsername ? ROUTES.PROFILE(profileUsername) : ROUTES.HOME;
  const displayName = currentUser?.displayName ?? clerkUser?.fullName ?? clerkUser?.username ?? "Profile";
  const username = profileUsername ?? "profile";
  const avatarUrl = currentUser?.avatarUrl ?? clerkUser?.imageUrl ?? null;
  const initial = initialForName(displayName);
  const relationshipSummary = currentUser
    ? `${currentUser.followerCount.toLocaleString()} followers · ${currentUser.followingCount.toLocaleString()} following`
    : currentUserQuery.isError
      ? "Profile unavailable"
      : null;
  const primaryItems: readonly MobileSidebarItem[] = useMemo(
    () => [
      { label: "Profile", href: profileHref, icon: "user" },
      { label: "Discover", href: ROUTES.DISCOVER, icon: "search" },
      { label: "Short Films", href: ROUTES.SHORT_FILMS, icon: "frames" },
      { label: "Bookmarks", href: ROUTES.BOOKMARKS, icon: "bookmark" },
      {
        label: "Lists",
        href: profileUsername ? ROUTES.PROFILE_LISTS(profileUsername) : profileHref,
        icon: SquareStack,
      },
      {
        label: "Diary",
        href: profileUsername ? ROUTES.PROFILE_DIARY(profileUsername) : profileHref,
        icon: CalendarDays,
      },
      { label: "Drafts", href: ROUTES.DRAFTS, icon: FileText },
    ],
    [profileHref, profileUsername]
  );
  const secondaryItems: readonly MobileSidebarItem[] = useMemo(
    () => [
      { label: "Chat", href: ROUTES.CHAT, icon: "chat" },
      { label: "Notifications", href: ROUTES.NOTIFICATIONS, icon: "bell" },
      { label: "Settings and privacy", href: ROUTES.SETTINGS, icon: "settings" },
      { label: "Help", href: ROUTES.HELP, icon: CircleHelp },
    ],
    []
  );

  const isActive = useMemo(
    () => (href: string) => isRouteActive(pathname ?? "", href),
    [pathname]
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusFrame = window.requestAnimationFrame(function () {
      sidebarRef.current?.focus({ preventScroll: true });
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !sidebarRef.current) return;

      const focusable = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) {
        event.preventDefault();
        sidebarRef.current.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  return (
    <aside
      ref={sidebarRef}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      tabIndex={-1}
      className={cn(
        "md:hidden fixed inset-y-0 left-0 z-0 w-[var(--mobile-sidebar-width)] bg-bg flex flex-col transition-opacity duration-200 ease-out focus:outline-none",
        "shadow-[8px_0_24px_rgba(0,0,0,0.16)]",
        "motion-reduce:transition-none",
        open ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!open}
    >
      <div className="px-[22px] pb-[22px] pt-[calc(2.25rem+env(safe-area-inset-top,0px))]">
        <Avatar
          initial={initial}
          src={avatarUrl}
          size="lg"
          variant="ring"
          loading="eager"
        />
        <div className="ios-sidebar-font mt-[14px] min-w-0">
          <p className="truncate text-[22px] font-black leading-[1.1] text-fg">{displayName}</p>
          <p className="mt-1 truncate text-[15px] font-bold leading-tight text-fg-muted">
            @{username}
          </p>
          {relationshipSummary ? (
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-fg-muted">
              {relationshipSummary}
            </p>
          ) : null}
        </div>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-[22px] pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
        aria-label="Mobile navigation"
      >
        <MobileSidebarSection
          items={primaryItems}
          onClose={onClose}
          isActive={isActive}
        />
        <div className="my-[18px] h-px bg-border" aria-hidden />
        <MobileSidebarSection
          items={secondaryItems}
          onClose={onClose}
          isActive={isActive}
          size="compact"
        />
      </nav>
    </aside>
  );
}
