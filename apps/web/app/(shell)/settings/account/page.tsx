import type { Metadata } from "next";
import { SettingsContent } from "@/features/settings/components/SettingsContent";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Manage your profile, username, email, and account settings.",
  robots: { index: false, follow: false },
};

export default function AccountSettingsPage() {
  return <SettingsContent initialTab="Account" />;
}
