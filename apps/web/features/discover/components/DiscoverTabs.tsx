"use client";

import { TopStickyBar } from "@/components/TopStickyBar/TopStickyBar";
import { BROWSE_CHROME_VARIANT } from "@/lib/config/uiFlags";
import { ROUTES } from "@/lib/constants/routes";
import { Clapperboard, Compass, LayoutList, PenLine } from "lucide-react";

export type DiscoverSection = "discover" | "films" | "lists" | "contribute";

const TABS = [
  {
    id: "discover",
    label: "Discover",
    href: ROUTES.DISCOVER,
    icon: <Compass className="h-4 w-4" />,
  },
  {
    id: "films",
    label: "Films",
    href: ROUTES.FILMS,
    icon: <Clapperboard className="h-4 w-4" />,
  },
  {
    id: "lists",
    label: "Lists",
    href: ROUTES.LISTS,
    icon: <LayoutList className="h-4 w-4" />,
  },
  {
    id: "contribute",
    label: "Contribute",
    href: ROUTES.CONTRIBUTE,
    icon: <PenLine className="h-4 w-4" />,
  },
] as const;

const FOCUSED_NAVIGATION_TABS = [
  { id: "discover", label: "Discover", href: ROUTES.DISCOVER },
  { id: "films", label: "Films", href: ROUTES.FILMS },
  { id: "lists", label: "Lists", href: ROUTES.LISTS },
] as const;

interface DiscoverTabsProps {
  active: DiscoverSection;
}

export function DiscoverTabs({ active }: DiscoverTabsProps) {
  const isFocusedNavigation = BROWSE_CHROME_VARIANT === "focused";

  if (isFocusedNavigation && active === "contribute") return null;

  return (
    <TopStickyBar
      tabs={isFocusedNavigation ? FOCUSED_NAVIGATION_TABS : TABS}
      activeTabId={active}
      navAriaLabel={isFocusedNavigation ? "Discover navigation" : "Explore 35mm"}
      rootClassName={
        isFocusedNavigation
          ? "hidden w-full border-b-0 bg-bg pb-4 pt-2 shadow-none md:mb-4 md:block"
          : "w-full bg-bg border-b-0 pb-0 pt-0 shadow-sm"
      }
      tabsViewportClassName={isFocusedNavigation ? "px-4 sm:px-6 lg:px-0" : undefined}
      tabsListClassName={
        isFocusedNavigation
          ? "gap-1 rounded-xl border border-fg/30 bg-elevated p-1"
          : "gap-2 px-4 py-2 sm:px-6 lg:px-10"
      }
      tabClassName={
        isFocusedNavigation
          ? "-mb-0 h-10 min-w-[7.5rem] flex-shrink-0 rounded-lg border-0 px-5 py-0 text-[14px] font-semibold tracking-[0.01em] transition-colors duration-150 md:flex-none"
          : "-mb-0 min-w-max flex-shrink-0 rounded-full px-4 py-0 text-[14px] tracking-[0.02em] h-10 inline-flex items-center justify-center font-medium border border-transparent transition-all duration-150 md:flex-none"
      }
      activeTabClassName={
        isFocusedNavigation
          ? "bg-fg text-bg"
          : "border-transparent bg-fg text-white font-semibold"
      }
      inactiveTabClassName={
        isFocusedNavigation
          ? "text-fg-muted hover:bg-hover hover:text-fg"
          : "bg-transparent text-fg-muted hover:bg-sunken hover:text-fg"
      }
    />
  );
}
