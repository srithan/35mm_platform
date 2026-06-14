import type { Metadata } from "next";
import { SettingsContent } from "@/features/settings/components/SettingsContent";

export const metadata: Metadata = {
  title: "Appearance Settings",
  description: "Manage theme, playback, and display preferences.",
  robots: { index: false, follow: false },
};

export default function AppearanceSettingsPage() {
  return <SettingsContent initialTab="Appearance" />;
}
