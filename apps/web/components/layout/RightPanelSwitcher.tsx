"use client";

import { usePathname } from "next/navigation";
import { isUsernameProfilePath } from "@/lib/utils/navigation";
import { FeedRightPanel } from "@/features/feed/components/FeedRightPanel";
import { DiscoverRightPanel } from "@/features/discover/components/DiscoverRightPanel";
import { ProfileRightPanel } from "@/features/profile/components/ProfileRightPanel";
import { NotificationsRightPanel } from "@/features/notifications/components/NotificationsRightPanel";
import { SettingsRightPanel } from "@/features/settings/components/SettingsRightPanel";

export function RightPanelSwitcher() {
  const pathname = usePathname();

  if (pathname && isUsernameProfilePath(pathname)) return <ProfileRightPanel />;
  if (pathname === "/discover") return <DiscoverRightPanel />;
  if (pathname === "/notifications") return <NotificationsRightPanel />;
  if (pathname === "/settings") return <SettingsRightPanel />;

  return <FeedRightPanel />;
}
