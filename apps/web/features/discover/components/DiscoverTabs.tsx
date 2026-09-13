"use client";

import { TopStickyBar } from "@/components/TopStickyBar/TopStickyBar";
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

interface DiscoverTabsProps {
  active: DiscoverSection;
}

export function DiscoverTabs({ active }: DiscoverTabsProps) {
  return (
    <TopStickyBar
      tabs={TABS}
      activeTabId={active}
      navAriaLabel="Explore 35mm"
      rootClassName="w-full bg-bg border-b-0 pb-0 pt-0 shadow-sm"
      tabsListClassName="gap-2 px-4 py-2 sm:px-6 lg:px-10"
      tabClassName="-mb-0 min-w-max flex-shrink-0 rounded-full px-4 py-0 text-[14px] tracking-[0.02em] h-10 inline-flex items-center justify-center font-medium border border-transparent transition-all duration-150 md:flex-none"
      activeTabClassName="border-transparent bg-fg text-white font-semibold"
      inactiveTabClassName="bg-transparent text-fg-muted hover:bg-sunken hover:text-fg"
    />
  );
}
