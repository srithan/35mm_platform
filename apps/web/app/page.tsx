import type { Metadata } from "next";
import { Suspense } from "react";
import { ShellGrid } from "@/components/layout/ShellGrid";
import { ScrollRestore } from "@/features/feed/components/FeedScrollRestore";
import { FeedWithComposer } from "@/features/feed/components/FeedWithComposer";
import { InfinitePostList } from "@/features/feed/components/InfinitePostList";
import { LandingCarousel } from "@/features/landing/components/LandingCarousel";
import { LandingPage } from "@/features/landing/components/LandingPage";
import { OnboardingGate } from "@/features/onboarding/components/OnboardingGate";
import { getIsAuthenticated } from "@/lib/auth";

export const metadata: Metadata = {
  title: "35mm",
  description:
    "35mm is a social network for directors, critics, and film lovers.",
  openGraph: {
    title: "35mm",
    description:
      "35mm is a social network for directors, critics, and film lovers.",
  },
  twitter: {
    title: "35mm",
    description:
      "35mm is a social network for directors, critics, and film lovers.",
  },
};

export default async function RootPage() {
  const isAuthenticated = await getIsAuthenticated();

  if (!isAuthenticated) {
    return (
      <LandingPage>
        <Suspense
          fallback={
            <div className="landing-carousel-fallback">
              <span>Loading...</span>
            </div>
          }
        >
          <LandingCarousel />
        </Suspense>
      </LandingPage>
    );
  }

  return (
    <>
      <ScrollRestore />
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
