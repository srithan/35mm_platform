"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Clapperboard,
  Compass,
  Home,
  LayoutList,
  type LucideIcon,
} from "lucide-react";
import { BROWSE_RAIL_ENABLED } from "@/lib/config/uiFlags";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { isRouteActive } from "@/lib/utils/navigation";
import { ProfileCompletionWidget } from "./ProfileCompletionWidget";

type HomeMenuItem = {
  label: string;
  href: string;
  Icon: LucideIcon;
  active?: boolean;
};

type HomeProfileCompletionSidebarProps = {
  layout?: "home" | "directory";
  placement?: "fixed" | "inline";
};

function HomeFeedMenu({ items }: { items: readonly HomeMenuItem[] }) {
  return (
    <nav
      aria-label="Feed menu"
      className="mb-6 flex flex-col gap-0.5 border-l border-border pl-2"
    >
      {items.map(function (item) {
        var active = Boolean(item.active);
        var Icon = item.Icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-active={active}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-r-md px-3 text-[14px] no-underline transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              active
                ? "font-bold text-fg"
                : "font-medium text-fg-muted hover:bg-hover/60 hover:text-fg"
            )}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute -left-[9px] top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
              />
            ) : null}
            <span
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center transition-colors",
                active
                  ? "text-accent"
                  : "text-fg-faint group-hover:text-fg-muted"
              )}
              aria-hidden
            >
              <Icon
                className="h-[18px] w-[18px]"
                strokeWidth={active ? 2.2 : 1.9}
                aria-hidden
              />
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function HomeProfileCompletionSidebar({
  layout = "home",
  placement = "fixed",
}: HomeProfileCompletionSidebarProps) {
  var { isLoaded, isSignedIn } = useAuth();
  var pathname = usePathname() ?? "";
  var showRailMenu = BROWSE_RAIL_ENABLED;
  var isDirectoryLayout = showRailMenu && layout === "directory";
  var top =
    "calc(var(--site-header-sticky-offset, 4.5rem) + var(--home-main-below-header-gap, 1rem))";
  var maxHeight =
    "calc(100vh - var(--site-header-sticky-offset, 4.5rem) - var(--home-main-below-header-gap, 1rem) - env(safe-area-inset-bottom, 0px))";
  var style: CSSProperties =
    placement === "inline"
      ? ({
          "--home-profile-sidebar-top": top,
          maxHeight,
        } as CSSProperties)
      : ({
          "--home-profile-sidebar-top": top,
          right: isDirectoryLayout
            ? "calc(50vw + var(--home-explore-center-column-half-width, 432px) + var(--home-sidebar-gap, 2rem))"
            : "calc(50vw + 320px + var(--home-sidebar-gap, 2rem))",
          width: isDirectoryLayout
            ? "min(var(--home-explore-left-rail-width, 220px), calc(min(50vw, 700px) - 1rem - var(--home-explore-center-column-half-width, 432px) - var(--home-sidebar-gap, 2rem)))"
            : "calc(min(50vw, 700px) - 1rem - 320px - var(--home-sidebar-gap, 2rem))",
          maxHeight,
        } as CSSProperties);

  if (!isLoaded || !isSignedIn) return null;

  var menuItems: HomeMenuItem[] = showRailMenu ? [
    {
      label: "Your Feed",
      href: ROUTES.HOME,
      Icon: Home,
      active: isRouteActive(pathname, ROUTES.HOME),
    },
    {
      label: "Discover",
      href: ROUTES.DISCOVER,
      Icon: Compass,
      active: isRouteActive(pathname, ROUTES.DISCOVER),
    },
    {
      label: "Films",
      href: ROUTES.FILMS,
      Icon: Clapperboard,
      active: isRouteActive(pathname, ROUTES.FILMS),
    },
    {
      label: "Lists",
      href: ROUTES.LISTS,
      Icon: LayoutList,
      active: isRouteActive(pathname, ROUTES.LISTS),
    },
  ] : [];

  return (
    <aside
      aria-label={showRailMenu ? "Feed sidebar" : "Profile setup"}
      className={cn(
        placement === "inline"
          ? "sticky top-[var(--home-profile-sidebar-top)] z-10 hidden min-w-0 overflow-y-auto pb-8 [scrollbar-width:thin] xl:block"
          : "fixed top-[var(--home-profile-sidebar-top)] z-10 hidden min-w-0 overflow-y-auto pb-8 [scrollbar-width:thin] xl:block"
      )}
      style={style}
    >
      {showRailMenu ? <HomeFeedMenu items={menuItems} /> : null}
      {showRailMenu ? (
        <section aria-label="Profile setup">
          <ProfileCompletionWidget />
        </section>
      ) : (
        <ProfileCompletionWidget />
      )}
    </aside>
  );
}
