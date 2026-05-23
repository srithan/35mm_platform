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

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;
  return <ResetPasswordPage resetToken={token} />;
}
