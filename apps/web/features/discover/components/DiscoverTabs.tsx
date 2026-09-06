"use client";

import { TopStickyBar } from "@/components/TopStickyBar/TopStickyBar";
import { ROUTES } from "@/lib/constants/routes";

export type DiscoverSection = "discover" | "films" | "lists" | "contribute";

const TABS = [
  { id: "discover", label: "Discover", href: ROUTES.DISCOVER },
  { id: "films", label: "Films", href: ROUTES.FILMS },
  { id: "lists", label: "Lists", href: ROUTES.LISTS },
  { id: "contribute", label: "Contribute", href: ROUTES.CONTRIBUTE },
] as const;

interface DiscoverTabsProps {
  active: DiscoverSection;
}

export function DiscoverTabs({ active }: DiscoverTabsProps) {
  return (
    <TopStickyBar
      tabs={TABS}
      activeTabId={active}
      navAriaLabel="Explore 35mm"
      rootClassName="w-full bg-bg pb-0 pt-0"
      tabsListClassName="px-4 sm:px-6 lg:px-10"
      tabClassName="min-w-max flex-shrink-0 py-3.5 text-[14px] tracking-[0.02em] md:flex-none"
      activeTabClassName="border-accent font-semibold text-fg"
      inactiveTabClassName="text-fg-muted hover:text-fg font-medium"
    />
  );
}
