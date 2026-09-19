"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Clapperboard,
  ChevronRight,
  Compass,
  Home,
  LayoutList,
  type LucideIcon,
} from "lucide-react";
import { BROWSE_RAIL_MENU_ENABLED } from "@/lib/config/uiFlags";
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
      className="mb-6 w-full max-w-[var(--home-explore-left-rail-width,220px)] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--fg)_10%,var(--border))] bg-elevated p-2.5 shadow-[0_10px_32px_-24px_color-mix(in_srgb,var(--fg)_42%,transparent)]"
    >
      <div className="px-2.5 pb-2.5 pt-2">
        <p className="text-[13px] font-bold leading-none tracking-[-0.01em] text-fg">
          Browse
        </p>
      </div>

      <div className="flex flex-col gap-1">
        {items.map(function (item) {
          const active = Boolean(item.active);
          const Icon = item.Icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              data-active={active}
              className={cn(
                "group relative flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-2 text-[15px] no-underline transition-[background-color,color,transform] duration-150 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-inset",
                active
                  ? "bg-[color-mix(in_srgb,var(--fg)_6%,var(--elevated))] font-bold text-fg"
                  : "font-semibold text-fg-muted hover:bg-sunken hover:text-fg"
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none",
                  active
                    ? "border-fg bg-fg text-bg shadow-sm"
                    : "border-[color-mix(in_srgb,var(--fg)_10%,var(--border))] bg-bg text-fg-muted group-hover:border-[color-mix(in_srgb,var(--fg)_18%,var(--border))] group-hover:text-fg"
                )}
                aria-hidden
              >
                <Icon
                  className="h-[17px] w-[17px]"
                  strokeWidth={active ? 2.25 : 1.9}
                  aria-hidden
                />
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <ChevronRight
                aria-hidden
                className={cn(
                  "h-4 w-4 shrink-0 transition-[color,transform] duration-150 motion-reduce:transition-none group-hover:translate-x-0.5",
                  active ? "text-fg-muted" : "text-fg-faint group-hover:text-fg-muted"
                )}
                strokeWidth={2}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function HomeProfileCompletionSidebar({
  layout = "home",
  placement = "fixed",
}: HomeProfileCompletionSidebarProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname() ?? "";
  const showRailMenu = BROWSE_RAIL_MENU_ENABLED;
  const isDirectoryLayout = showRailMenu && layout === "directory";
  const top =
    "calc(var(--site-header-sticky-offset, 4.5rem) + var(--home-main-below-header-gap, 1rem))";
  const maxHeight =
    "calc(100vh - var(--site-header-sticky-offset, 4.5rem) - var(--home-main-below-header-gap, 1rem) - env(safe-area-inset-bottom, 0px))";
  const style: CSSProperties =
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

  const menuItems: HomeMenuItem[] = showRailMenu ? [
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
