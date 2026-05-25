import type { Metadata } from "next";
import { SettingsContent } from "@/features/settings/components/SettingsContent";

export const metadata: Metadata = {
  title: "Privacy Settings",
  description: "Manage privacy, muted accounts, and blocked accounts.",
  robots: { index: false, follow: false },
};

export default function PrivacySettingsPage() {
  return <SettingsContent initialTab="Privacy" />;
}
