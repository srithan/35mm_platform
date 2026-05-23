import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { AuthCard } from "@/features/auth/components/AuthCard";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your 35mm.in account.",
  openGraph: {
    title: "Log in",
    description: "Sign in to your 35mm.in account.",
  },
};

function LoginFallback() {
  return (
    <AuthCard>
      <div className="h-40 flex items-center justify-center text-[var(--auth-fg)]/40 text-sm">
        Loading…
      </div>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
