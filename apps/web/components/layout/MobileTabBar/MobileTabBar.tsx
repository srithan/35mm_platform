"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { isRouteActive, isUsernameProfilePath } from "@/lib/utils/navigation";
import { Home, Bell, Plus, User } from "lucide-react";
import { Icon } from "@/components/Icon/Icon";
import { notificationsKeys } from "@/features/notifications/hooks/queryKeys";
import { fetchNotifications } from "@/features/notifications/api/notificationsApi";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { useMobileBottomChromeStore } from "@/stores/useMobileBottomChromeStore";

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

function isOwnProfilePath(pathname: string, username: string | null | undefined) {
  if (!username) return false;
  if (!isUsernameProfilePath(pathname)) return false;
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment === username;
}

function TabIcon({
  tabId,
  active,
}: {
  tabId: "home" | "discover" | "notifications" | "profile";
  active: boolean;
}) {
  const className = "h-[22px] w-[22px] shrink-0";
  const strokeWidth = active ? 2.5 : 2;

  if (tabId === "home") {
    return <Home className={className} strokeWidth={strokeWidth} />;
  }
  if (tabId === "discover") {
    return <Icon name="discover" className={className} />;
  }
  if (tabId === "notifications") {
    return <Bell className={className} strokeWidth={strokeWidth} />;
  }
  return <User className={className} strokeWidth={strokeWidth} />;
}

export function MobileTabBar() {
  const pathname = usePathname() ?? "";
  const { user: clerkUser } = useUser();
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const username = currentUser?.username ?? clerkUser?.username ?? null;
  const profileHref = username ? ROUTES.PROFILE(username) : ROUTES.AUTH_LOGIN;
  const notificationsCount = useNotificationBellCount();
  const navVisible = useMobileBottomChromeStore(function (state) {
    return state.navVisible;
  });

  const tabs = [
    {
      kind: "link" as const,
      id: "home" as const,
      label: "Home",
      href: ROUTES.HOME,
      active: isRouteActive(pathname, ROUTES.HOME),
    },
    {
      kind: "link" as const,
      id: "discover" as const,
      label: "Discover",
      href: ROUTES.DISCOVER,
      active: isRouteActive(pathname, ROUTES.DISCOVER),
    },
    {
      kind: "link" as const,
      id: "compose" as const,
      label: "New post",
      href: ROUTES.NEW_POST,
      active: isRouteActive(pathname, ROUTES.NEW_POST),
      icon: "plus" as const,
    },
    {
      kind: "link" as const,
      id: "notifications" as const,
      label: "Notifications",
      href: ROUTES.NOTIFICATIONS,
      active: isRouteActive(pathname, ROUTES.NOTIFICATIONS),
      badge: notificationsCount,
    },
    {
      kind: "link" as const,
      id: "profile" as const,
      label: "Profile",
      href: profileHref,
      active: isOwnProfilePath(pathname, username),
    },
  ];

  return (
    <nav
      aria-label="Main navigation"
      aria-hidden={!navVisible}
      className={cn(
        "md:hidden fixed inset-x-0 z-40 px-3",
        "bottom-[max(0.625rem,env(safe-area-inset-bottom,0px))]",
        "pointer-events-none transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        navVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-[calc(100%+1rem)] opacity-0"
      )}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto flex h-[3.25rem] max-w-[480px] items-center justify-between px-1.5",
          "rounded-full border border-border bg-bg shadow-sm"
        )}
      >
        {tabs.map(function (tab) {
          const count = typeof tab.badge === "number" ? tab.badge : 0;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex flex-1 items-center justify-center min-w-0 py-1",
                "rounded-full transition-transform duration-150 active:scale-[0.94]"
              )}
              aria-current={tab.active ? "page" : undefined}
              aria-label={
                count > 0 ? tab.label + " (" + String(count) + " unread)" : tab.label
              }
            >
              <span
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-2xl transition-colors",
                  tab.active ? "bg-fg/[0.08] text-fg" : "text-fg-muted"
                )}
              >
                {tab.icon === "plus" ? (
                  <Plus
                    className="h-[24px] w-[24px] shrink-0"
                    strokeWidth={tab.active ? 2.5 : 2}
                  />
                ) : (
                  <TabIcon tabId={tab.id} active={tab.active} />
                )}
                {count > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none unread-notification-badge">
                    {count > 99 ? "99+" : count}
                    <span className="sr-only"> unread</span>
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
