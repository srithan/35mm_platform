import { ShellGrid } from "@/components/layout/ShellGrid";
import { AuthBootstrap } from "@/features/auth/components/AuthBootstrap";
import { OnboardingGate } from "@/features/onboarding/components/OnboardingGate";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthBootstrap />
      <OnboardingGate />
      <a
        href="#main-content"
        className="sr-only"
      >
        Skip to main content
      </a>
      <ShellGrid>{children}</ShellGrid>
    </>
  );
}
