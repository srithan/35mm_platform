import type { Metadata } from "next";
import { SettingsContent } from "@/features/settings/components/SettingsContent";

export const metadata: Metadata = {
  title: "Your Reports",
  description: "Track the status of content you've reported.",
  robots: { index: false, follow: false },
};

export default function ReportsSettingsPage() {
  return <SettingsContent initialTab="Privacy" privacyList="reports" />;
}
