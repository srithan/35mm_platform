import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account, notifications, privacy, and appearance settings.",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  redirect(ROUTES.SETTINGS_ACCOUNT);
}
