"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  Clapperboard,
  FileText,
  List as ListIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  profileTabHref,
  resolveProfileTabFromPathname,
  type ProfileTab,
} from "@/features/profile/lib/profileRoutes";

type TabDefinition = {
  id: ProfileTab;
  label: string;
  count?: number;
  Icon: LucideIcon;
};

export const PROFILE_TABS: TabDefinition[] = [
  { id: "posts", label: "Posts", Icon: FileText },
  { id: "diary", label: "Diary", count: 0, Icon: Clapperboard },
  { id: "lists", label: "Lists", Icon: ListIcon },
  { id: "stats", label: "Stats", Icon: BarChart2 },
];

export function ProfileTabs(props: { username: string }) {
  var pathname = usePathname();
  var activeTab = resolveProfileTabFromPathname(pathname, props.username) ?? "posts";
  var shouldReduceMotion = useReducedMotion();

  return (
    <nav
      aria-label="Profile sections"
      className={cn(
        "sticky z-40 border-b border-border bg-bg backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--bg)_96%,var(--elevated))]",
        "top-[var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))]",
        "md:top-[var(--site-header-sticky-offset,4.5rem)]"
      )}
    >
      <div>
        <ul className="m-0 flex w-full list-none items-stretch gap-0 p-0">
          {PROFILE_TABS.map(function (t) {
            var isActive = activeTab === t.id;
            var Icon = t.Icon;
            var showCount = typeof t.count === "number" && t.count > 0;

            return (
              <li key={t.id} className="min-w-0 flex-1">
                <Link
                  href={profileTabHref(props.username, t.id)}
                  scroll={false}
                  aria-label={t.label}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex w-full min-w-0 items-center justify-center border-b-[3px] border-transparent px-2 py-3.5 md:px-3",
                    "font-sans text-[14px] tracking-[0.02em] transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2",
                    isActive
                      ? "font-semibold text-fg"
                      : "font-medium text-fg-muted hover:text-fg"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors duration-150 md:h-[17px] md:w-[17px]",
                      isActive ? "text-fg opacity-100" : "text-fg-faint opacity-90"
                    )}
                    strokeWidth={isActive ? 2.1 : 1.9}
                    aria-hidden
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex shrink-0 items-baseline overflow-hidden whitespace-nowrap",
                      "transition-[max-width,margin,opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                      "motion-reduce:transition-none md:ml-2 md:max-w-none md:translate-x-0 md:opacity-100",
                      isActive
                        ? "ml-2 max-w-[7.5rem] translate-x-0 opacity-100"
                        : "ml-0 max-w-0 -translate-x-1 opacity-0"
                    )}
                  >
                    {t.label}
                    {showCount ? (
                      <span
                        className={cn(
                          "ml-1.5 text-[11px] font-medium tabular-nums",
                          isActive ? "text-fg-muted" : "text-fg-faint"
                        )}
                      >
                        {String(t.count)}
                      </span>
                    ) : null}
                  </span>
                  {isActive ? (
                    <motion.span
                      layoutId={`profile-tab-indicator-${props.username.toLowerCase()}`}
                      className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-fg md:inset-x-3"
                      initial={false}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : {
                              type: "spring",
                              stiffness: 500,
                              damping: 38,
                              mass: 0.55,
                            }
                      }
                      aria-hidden
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
