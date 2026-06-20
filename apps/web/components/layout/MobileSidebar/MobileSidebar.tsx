"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { Avatar } from "@/components/Avatar";
import { useComposerModal } from "@/components/layout/PostComposerModalContext";
import { Icon } from "@/components/Icon/Icon";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { isRouteActive } from "@/lib/utils/navigation";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";

type MobileSidebarIconName =
  | "home"
  | "search"
  | "frames"
  | "bell"
  | "user"
  | "bookmark"
  | "settings";

interface MobileSidebarItem {
  label: string;
  href: string;
  icon: MobileSidebarIconName;
  badge?: number;
}

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

function MobileSidebarSection({
  items,
  onClose,
  isActive,
}: {
  items: readonly MobileSidebarItem[];
  onClose: () => void;
  isActive: (href: string) => boolean;
}) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.label + ":" + item.href}
            href={item.href}
            onClick={onClose}
            data-active={active}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 py-3 px-3 rounded-lg text-[15px] font-bold no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/10",
              active
                ? "text-fg bg-neutral-100 [&_svg]:text-fg"
                : "text-fg-muted hover:text-fg hover:bg-border/60"
            )}
          >
            <Icon name={item.icon} className="w-5 h-5 flex-shrink-0 text-fg-muted transition-colors group-hover:text-fg group-data-[active]:text-accent" strokeWidth={2} />
            {item.label}
            {typeof item.badge === "number" ? (
              <span className="unread-notification-badge text-[10px] px-1.5 py-0.5 rounded-full font-mono leading-tight ml-auto">
                <span aria-hidden>{item.badge}</span>
                <span className="sr-only">{item.badge} unread items</span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { user: clerkUser } = useUser();
  const { openComposerModal } = useComposerModal();
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const profileUsername = currentUser?.username ?? clerkUser?.username ?? null;
  const profileHref = profileUsername ? ROUTES.PROFILE(profileUsername) : ROUTES.HOME;
  const displayName = currentUser?.displayName ?? clerkUser?.fullName ?? clerkUser?.username ?? "Profile";
  const username = profileUsername ?? "profile";
  const avatarUrl = currentUser?.avatarUrl ?? clerkUser?.imageUrl ?? null;
  const initial = initialForName(displayName);
  const navItems: readonly MobileSidebarItem[] = useMemo(
    () => [
      { label: "Your Feed", href: ROUTES.HOME, icon: "home" },
      { label: "Discover", href: ROUTES.DISCOVER, icon: "search" },
      { label: "Short films", href: ROUTES.SHORT_FILMS, icon: "frames" },
      { label: "Notifications", href: ROUTES.NOTIFICATIONS, badge: 3, icon: "bell" },
      { label: "Bookmarks", href: ROUTES.BOOKMARKS, icon: "bookmark" },
      { label: "Profile", href: profileHref, icon: "user" },
      { label: "Settings", href: ROUTES.SETTINGS, icon: "settings" },
    ],
    [profileHref]
  );

  const isActive = useMemo(
    () => (href: string) => isRouteActive(pathname ?? "", href),
    [pathname]
  );

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        role="presentation"
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[100] bg-fg/25 backdrop-blur-sm transition-opacity duration-300 ease-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed top-0 left-0 bottom-0 z-[101] w-[min(260px,72vw)] max-w-[260px] bg-bg border-r border-border shadow-xl flex flex-col pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <Link
          href={profileHref}
          onClick={onClose}
          className="block px-4 py-4 border-b border-border no-underline text-inherit hover:bg-border/40 transition-colors active:opacity-90"
        >
          <div className="flex items-start">
            <Avatar
              initial={initial}
              src={avatarUrl}
              size="lg"
              variant="ring"
            />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[17px] text-fg">{displayName}</span>
              <Icon name="check" className="w-4 h-4 text-accent shrink-0" strokeWidth={3} />
            </div>
            <p className="text-[13px] text-fg-muted mt-0.5">@{username}</p>
            <div className="flex gap-4 mt-2 text-[13px] text-fg-muted">
              <span>
                <span className="font-bold text-fg">2,961</span> Following
              </span>
              <span>
                <span className="font-bold text-fg">950</span> Followers
              </span>
            </div>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Mobile navigation">
          <MobileSidebarSection items={navItems} onClose={onClose} isActive={isActive} />
        </nav>

        <div className="px-2 pb-2">
          <button
            type="button"
            onClick={function () {
              onClose();
              openComposerModal();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-[15px] font-bold bg-accent text-accent-fg hover:opacity-95 active:opacity-90 transition-opacity"
          >
            <Icon name="plus" className="w-5 h-5" strokeWidth={2} />
            New post
          </button>
        </div>
      </aside>
    </>
  );
}
