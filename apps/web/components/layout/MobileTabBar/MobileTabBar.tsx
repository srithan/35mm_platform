"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { isRouteActive } from "@/lib/utils/navigation";
import { Home, Search, Bell } from "lucide-react";
import { UNREAD_IDS } from "@/features/notifications/data/notificationsData";

const notificationsCount = UNREAD_IDS.length;

const TABS = [
  { label: "Feed", href: ROUTES.HOME, icon: Home },
  { label: "Discover", href: ROUTES.DISCOVER, icon: Search },
  { label: "Notifications", href: ROUTES.NOTIFICATIONS, icon: Bell, badge: notificationsCount },
] as const;

export function MobileTabBar() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg border-t border-border shadow-[0_-2px_10px_rgba(26,25,23,0.04)] pb-[env(safe-area-inset-bottom,0px)] pr-[var(--app-scrollbar-gutter,0px)]"
      )}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {TABS.map((tab) => {
          const { label, href, icon: Icon } = tab;
          const active = isRouteActive(pathname, href);
          const count = "badge" in tab ? (tab.badge ?? 0) : 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 px-2 rounded-xl transition-all duration-200 active:scale-[0.96]",
                active
                  ? "text-fg"
                  : "text-fg-muted hover:text-fg-light"
              )}
              aria-current={active ? "page" : undefined}
              aria-label={count > 0 ? `${label} (${count} unread)` : label}
            >
              <span
                className={cn(
                  "relative flex items-center justify-center w-9 h-9 rounded-full transition-colors",
                  active && "bg-fg/5"
                )}
              >
                <Icon
                  className={cn("w-[22px] h-[22px] flex-shrink-0", active && "stroke-[2.5] text-fg")}
                  strokeWidth={active ? 2.5 : 2}
                />
                {count > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full unread-notification-badge text-[10px] font-semibold leading-none"
                  >
                    {count > 99 ? "99+" : count}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium truncate max-w-full",
                  active ? "font-semibold text-fg" : "text-fg-muted"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
