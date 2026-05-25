"use client";

import { useRouter } from "next/navigation";
import { OnboardingModal } from "@/features/onboarding/components/OnboardingModal";

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-bg">
      <OnboardingModal
        onCompleted={function () {
          router.replace("/");
        }}
      />
    </main>
  );
}
