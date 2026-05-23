"use client";

import { cn } from "@/lib/utils/cn";
import { TopStickyBar } from "@/components/TopStickyBar/TopStickyBar";

export type DiscoverTab = "Explore" | "Now Playing" | "TV Shows";

const TABS: DiscoverTab[] = ["Explore", "TV Shows", "Now Playing"];

interface DiscoverTabsProps {
  active: DiscoverTab;
  onSelect: (tab: DiscoverTab) => void;
}

export function DiscoverTabs({ active, onSelect }: DiscoverTabsProps) {
  const tabs = TABS.map((tab) => ({ id: tab, label: tab, onClick: () => onSelect(tab) }));

  return (
    <TopStickyBar
      tabs={tabs}
      activeTabId={active}
      navAriaLabel="Discover sections"
      rootClassName="w-full pt-0 pb-0"
      tabsListClassName=""
      tabClassName="min-w-max flex-shrink-0 py-3.5 text-[14px] tracking-[0.02em] md:flex-none"
      activeTabClassName={cn("text-fg font-semibold", "border-[var(--discover-tab-active,#e03e3e)]")}
      inactiveTabClassName="text-fg-muted hover:text-fg font-medium"
    />
  );
}
