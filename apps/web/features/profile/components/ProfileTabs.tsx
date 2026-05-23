"use client";

import type { LucideIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import {
  BarChart2,
  Clapperboard,
  FileText,
  List as ListIcon,
} from "lucide-react";
import { TopStickyBar } from "@/components/TopStickyBar/TopStickyBar";
import { cn } from "@/lib/utils/cn";

type TabDefinition = {
  id: "posts" | "reviews" | "lists" | "stats";
  label: string;
  count?: number;
  Icon: LucideIcon;
};

export const PROFILE_TABS: TabDefinition[] = [
  { id: "posts", label: "Posts", Icon: FileText },
  { id: "reviews", label: "Reviews", count: 47, Icon: Clapperboard },
  { id: "lists", label: "Lists", count: 12, Icon: ListIcon },
  { id: "stats", label: "Stats", Icon: BarChart2 },
];

export function ProfileStickyTabs() {
  var [tab, setTab] = useQueryState("tab", { defaultValue: "posts" });
  var tabs = PROFILE_TABS.map(function (t) {
    return {
      id: t.id,
      label: t.label,
      count: t.count,
      onClick: function () {
        setTab(t.id);
      },
    };
  });

  return (
    <TopStickyBar
      tabs={tabs}
      activeTabId={tab}
      navAriaLabel="Profile sections"
      rootClassName="pt-0 md:pt-0 pb-0"
      tabsListClassName="w-full px-4 md:justify-center"
      tabClassName="flex-1 min-w-max flex-shrink-0 flex justify-center items-center text-[14px] py-3.5 tracking-[0.02em]"
    />
  );
}

/** Left icon rail on `lg:` and up (reference: ProfileLeft menu-bar). */
export function ProfileSidebarTabs() {
  var [tab, setTab] = useQueryState("tab", { defaultValue: "posts" });
  var stickyTop = "calc(var(--site-header-sticky-offset, 4.5rem) + 1rem)";

  return (
    <nav
      aria-label="Profile sections"
      className="hidden lg:block w-[242px] shrink-0 sticky self-start pb-12"
      style={{ top: stickyTop }}
    >
      <ul className="m-0 p-0 list-none border-r border-border pr-8 space-y-1">
        {PROFILE_TABS.map(function (t) {
          var isActive = tab === t.id;
          var Icon = t.Icon;
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={function () {
                  setTab(t.id);
                }}
                className={cn(
                  "w-full flex items-center gap-3.5 text-left px-4 py-[0.6875rem] rounded-lg border-none cursor-pointer transition-colors bg-transparent font-sans",
                  "text-[15px] leading-snug tracking-[0.01em]",
                  isActive
                    ? "font-semibold text-fg bg-fg-muted/18"
                    : "font-semibold text-fg-muted hover:text-fg hover:bg-fg-muted/12"
                )}
              >
                <Icon className="w-[22px] h-[22px] shrink-0 opacity-95" strokeWidth={2} aria-hidden />
                <span className="min-w-0">
                  {t.label}
                  {typeof t.count === "number" ? (
                    <span
                      className={cn(
                        "ml-1.5 tabular-nums text-[12px] font-medium",
                        isActive ? "text-fg-muted" : "text-fg-muted/85"
                      )}
                    >
                      · {String(t.count)}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
