import type { Metadata } from "next";
import { SettingsContent } from "@/features/settings/components/SettingsContent";

export const metadata: Metadata = {
  title: "Notification Settings",
  description: "Manage push, activity, watchlist, and email notification settings.",
  robots: { index: false, follow: false },
};

export default function NotificationSettingsPage() {
  return <SettingsContent initialTab="Notifications" />;
}
