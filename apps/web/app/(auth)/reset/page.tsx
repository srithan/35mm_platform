import type { Metadata } from "next";
import { ResetPasswordPage } from "@/features/auth/components/ResetPasswordPage";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password for your 35mm.in account.",
  openGraph: {
    title: "Reset password",
    description: "Set a new password for your 35mm.in account.",
  },
};

export default function ResetPage() {
  return <ResetPasswordPage />;
}
