import type { Metadata } from "next";
import { NotificationsContent } from "@/features/notifications/components/NotificationsContent";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Your latest notifications — likes, follows, mentions, and updates from the 35mm community.",
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return <NotificationsContent />;
}
