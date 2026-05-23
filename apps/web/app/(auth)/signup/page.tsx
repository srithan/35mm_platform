import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/features/auth/components/SignupForm";
import { AuthCard } from "@/features/auth/components/AuthCard";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a 35mm.in account for filmmakers and film lovers.",
  openGraph: {
    title: "Sign up",
    description: "Create a 35mm.in account for filmmakers and film lovers.",
  },
};

function SignupFallback() {
  return (
    <AuthCard>
      <div className="h-48 flex items-center justify-center text-[var(--auth-fg)]/40 text-sm">
        Loading…
      </div>
    </AuthCard>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  );
}
