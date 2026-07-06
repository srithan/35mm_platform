import { SettingsContent } from "@/features/settings/components/SettingsContent";

export const metadata = {
  title: "Muted Accounts",
  description: "Review and unmute accounts you have muted.",
};

export default function MutedAccountsSettingsPage() {
  return <SettingsContent initialTab="Privacy" privacyList="muted" />;
}
