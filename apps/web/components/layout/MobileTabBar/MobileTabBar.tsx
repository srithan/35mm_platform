"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { isRouteActive } from "@/lib/utils/navigation";
import { Home, Search, Bell } from "lucide-react";
import { notificationsKeys } from "@/features/notifications/hooks/queryKeys";
import { fetchNotifications } from "@/features/notifications/api/notificationsApi";

function useNotificationBellCount() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const query = useQuery({
    queryKey: notificationsKeys.unread(),
    queryFn: async function () {
      return fetchNotifications({
        token: await getToken(),
        unreadOnly: true,
        limit: 50,
      });
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 20_000,
    refetchInterval: 5_000,
    gcTime: 5 * 60_000,
  });

  return query.data?.items.length ?? 0;
}

function useMobileTabs() {
  const notificationsCount = useNotificationBellCount();

  return [
    { label: "Feed", href: ROUTES.HOME, icon: Home },
    { label: "Discover", href: ROUTES.DISCOVER, icon: Search },
    {
      label: "Notifications",
      href: ROUTES.NOTIFICATIONS,
      icon: Bell,
      badge: notificationsCount,
    },
  ] as const;
}

export function MobileTabBar() {
  const pathname = usePathname() ?? "";
  const tabs = useMobileTabs();

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg border-t border-border shadow-[0_-2px_10px_rgba(26,25,23,0.04)] pb-[env(safe-area-inset-bottom,0px)] pr-[var(--app-scrollbar-gutter,0px)]"
      )}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const { label, href, icon: Icon } = tab;
          const rawBadge = "badge" in tab ? tab.badge : 0;
          const active = isRouteActive(pathname, href);
          const count = typeof rawBadge === "number" ? rawBadge : Number(rawBadge || 0);
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
