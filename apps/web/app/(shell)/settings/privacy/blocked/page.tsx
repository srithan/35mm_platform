import { SettingsContent } from "@/features/settings/components/SettingsContent";

export const metadata = {
  title: "Blocked Accounts",
  description: "Review and unblock accounts you have blocked.",
};

export default function BlockedAccountsSettingsPage() {
  return <SettingsContent initialTab="Privacy" privacyList="blocked" />;
}
