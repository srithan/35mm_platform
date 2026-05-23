import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailForm } from "@/features/auth/components/VerifyEmailForm";
import { AuthCard } from "@/features/auth/components/AuthCard";

export const metadata: Metadata = {
  title: "Verify email",
  description: "Confirm your email address for 35mm.in.",
  openGraph: {
    title: "Verify email",
    description: "Confirm your email address for 35mm.in.",
  },
};

function VerifyFallback() {
  return (
    <AuthCard>
      <div className="h-36 flex items-center justify-center text-[var(--auth-fg)]/40 text-sm">
        Loading…
      </div>
    </AuthCard>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyFallback />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
