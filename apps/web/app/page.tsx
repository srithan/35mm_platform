import type { Metadata } from "next";
import { Suspense } from "react";
import { getIsAuthenticated } from "@/lib/auth";
import { LandingPage } from "@/features/landing/components/LandingPage";
import { LandingCarousel } from "@/features/landing/components/LandingCarousel";
import { ShellGrid } from "@/components/layout/ShellGrid";
import { ScrollRestore } from "@/features/feed/components/FeedScrollRestore";
import { FeedWithComposer } from "@/features/feed/components/FeedWithComposer";
import { InfinitePostList } from "@/features/feed/components/InfinitePostList";
import { OnboardingGate } from "@/features/onboarding/components/OnboardingGate";

export const metadata: Metadata = {
  title: "35mm.in — The Social Network for Cinema",
  description:
    "Log films. Follow directors and DPs. Debate cuts at 2am. Discover festivals, shorts, and the people who actually care about movies.",
  openGraph: {
    title: "35mm.in — The Social Network for Cinema",
    description:
      "Log films. Follow directors and DPs. Debate cuts at 2am. Discover festivals, shorts, and the people who actually care about movies.",
  },
  twitter: {
    title: "35mm.in — The Social Network for Cinema",
    description:
      "Log films. Follow directors and DPs. Debate cuts at 2am. Discover festivals, shorts, and the people who actually care about movies.",
  },
};

export default async function RootPage() {
  const authenticated = await getIsAuthenticated();

  if (!authenticated) {
    return (
      <LandingPage>
        <Suspense
          fallback={
            <div className="relative z-10 py-4 pb-8">
              <div className="scene flex min-h-[320px] items-center justify-center">
                <span className="text-[0.7rem] uppercase tracking-wider text-[#bbb]">Loading films...</span>
              </div>
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
