import { SettingsContent } from "@/features/settings/components/SettingsContent";

export const metadata = {
  title: "Media Settings",
  description: "Manage video playback, captions, and media preferences.",
};

export default function MediaSettingsPage() {
  return <SettingsContent initialTab="Media" />;
}
