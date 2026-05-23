import type { Metadata } from "next";
import { SettingsContent } from "@/features/settings/components/SettingsContent";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account, notifications, privacy, and appearance settings.",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <SettingsContent />;
}
