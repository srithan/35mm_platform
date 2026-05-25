"use client";

import type { LucideIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import {
  BarChart2,
  Clapperboard,
  FileText,
  List as ListIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type TabDefinition = {
  id: "posts" | "diary" | "lists" | "stats";
  label: string;
  count?: number;
  Icon: LucideIcon;
};

export const PROFILE_TABS: TabDefinition[] = [
  { id: "posts", label: "Posts", Icon: FileText },
  { id: "diary", label: "Diary", count: 0, Icon: Clapperboard },
  { id: "lists", label: "Lists", count: 12, Icon: ListIcon },
  { id: "stats", label: "Stats", Icon: BarChart2 },
];

export function ProfileTabs() {
  var [tab, setTab] = useQueryState("tab", { defaultValue: "posts" });

  return (
    <nav
      aria-label="Profile sections"
      className={cn(
        "sticky z-40 border-b border-border bg-white backdrop-blur-xl backdrop-saturate-[180%] supports-[backdrop-filter]:bg-white/[0.84]",
        "top-[calc(max(0.75rem,env(safe-area-inset-top,0px))+3.5rem)]",
        "md:top-[var(--site-header-sticky-offset,4.5rem)]"
      )}
    >
      <div className="overflow-x-auto scrollbar-hide">
        <ul className="m-0 flex w-max min-w-full list-none items-stretch gap-0 p-0">
          {PROFILE_TABS.map(function (t) {
            var isActive = tab === t.id;
            var Icon = t.Icon;
            var showCount = typeof t.count === "number" && t.count > 0;

            return (
              <li key={t.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={function () {
                    setTab(t.id);
                  }}
                  className={cn(
                    "flex w-full min-w-[5.5rem] items-center justify-center gap-2 border-b-[3px] border-transparent px-3 py-3.5",
                    "font-sans text-[14px] tracking-[0.02em] transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2",
                    isActive
                      ? "border-accent font-semibold text-fg"
                      : "font-medium text-fg-muted hover:text-fg"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[17px] w-[17px] shrink-0 transition-colors duration-150",
                      isActive ? "text-fg opacity-100" : "text-fg-faint opacity-90"
                    )}
                    strokeWidth={isActive ? 2.1 : 1.9}
                    aria-hidden
                  />
                  <span className="whitespace-nowrap">{t.label}</span>
                  {showCount ? (
                    <span
                      className={cn(
                        "text-[11px] font-medium tabular-nums",
                        isActive ? "text-fg-muted" : "text-fg-faint"
                      )}
                    >
                      {String(t.count)}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
