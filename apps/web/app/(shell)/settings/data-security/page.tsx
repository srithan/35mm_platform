import type { Metadata } from "next";
import { SettingsContent } from "@/features/settings/components/SettingsContent";

export const metadata: Metadata = {
  title: "Data & Security Settings",
  description: "Manage account data, cache, and account security actions.",
  robots: { index: false, follow: false },
};

export default function DataSecuritySettingsPage() {
  return <SettingsContent initialTab="Data & security" />;
}
