import type { Metadata } from "next";
import { ForgotPasswordPage } from "@/features/auth/components/ForgotPasswordPage";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Recover access to your 35mm.in account.",
  openGraph: {
    title: "Forgot password",
    description: "Recover access to your 35mm.in account.",
  },
};

export default function ForgotPage() {
  return <ForgotPasswordPage />;
}
