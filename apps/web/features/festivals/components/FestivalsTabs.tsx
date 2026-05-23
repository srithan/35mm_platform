"use client";

import { usePathname } from "next/navigation";
import { TopStickyBar } from "@/components/TopStickyBar/TopStickyBar";
import { ROUTES } from "@/lib/constants/routes";

const TABS = [
  {
    id: "browse",
    label: "Browse Festivals",
    labelMobile: "Browse",
    href: ROUTES.FESTIVALS,
  },
  {
    id: "projects",
    label: "Your Projects",
    labelMobile: "Projects",
    href: ROUTES.FESTIVALS_PROJECTS,
  },
  {
    id: "submissions",
    label: "Your Submissions",
    labelMobile: "Submissions",
    href: ROUTES.FESTIVALS_SUBMISSIONS,
  },
] as const;

export function FestivalsTabs() {
  const pathname = usePathname();

  // Hide these top-level tabs when we are viewing a specific festival page.
  // The base paths are /festivals, /festivals/projects, and /festivals/submissions.
  // Anything else like /festivals/berlinale-2026 is an individual festival page.
  const isBaseRoute = TABS.some((tab) => pathname === tab.href);
  if (!isBaseRoute) {
    return null;
  }

  const activeTabId = TABS.find((tab) => pathname === tab.href)?.id ?? "browse";

  return (
    <TopStickyBar
      tabs={TABS}
      activeTabId={activeTabId}
      navAriaLabel="Festival sections"
      rootClassName="pt-0 pb-0"
      tabClassName="min-w-max flex-shrink-0 flex justify-center items-center text-[14px] py-3 tracking-[0.02em] transition-all duration-150 md:flex-none"
    />
  );
}
