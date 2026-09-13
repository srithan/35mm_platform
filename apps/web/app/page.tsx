import type { Metadata } from "next";
import { ShellGrid } from "@/components/layout/ShellGrid";
import { FeedWithComposer } from "@/features/feed/components/FeedWithComposer";
import { InfinitePostList } from "@/features/feed/components/InfinitePostList";
import { LandingPage } from "@/features/landing/components/LandingPage";
import { OnboardingGate } from "@/features/onboarding/components/OnboardingGate";
import { getIsAuthenticated } from "@/lib/auth";

export const metadata: Metadata = {
  title: "35mm",
  description:
    "35mm is a social network for everyone in cinema.",
  openGraph: {
    title: "35mm",
    description:
      "Share what you make, talk about what moves you, and discover cinema on 35mm.",
  },
  twitter: {
    title: "35mm",
    description:
      "Share what you make, talk about what moves you, and discover cinema on 35mm.",
  },
};

export default async function RootPage() {
  const isAuthenticated = await getIsAuthenticated();

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <>
      <OnboardingGate />
      <a href="#main-content" className="sr-only">
        Skip to main content
      </a>
      <ShellGrid>
        <div className="min-h-full">
          <FeedWithComposer>
            <InfinitePostList />
          </FeedWithComposer>
        </div>
      </ShellGrid>
    </>
  );
}
