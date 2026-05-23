import type { Metadata } from "next";
import { Suspense } from "react";
import { isAuthenticated } from "@/lib/auth";
import { LandingPage } from "@/features/landing/components/LandingPage";
import { LandingCarousel } from "@/features/landing/components/LandingCarousel";
import { ShellGrid } from "@/components/layout/ShellGrid";
import { ScrollRestore } from "@/features/feed/components/FeedScrollRestore";
import { FeedWithComposer } from "@/features/feed/components/FeedWithComposer";
import { InfinitePostList } from "@/features/feed/components/InfinitePostList";
import { FeedOnboardingModal } from "@/features/feed/components/FeedOnboardingModal";

const SHOW_ONBOARDING_MODAL = false;

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

export default function RootPage() {
  if (!isAuthenticated) {
    return (
      <LandingPage>
        <Suspense
          fallback={
            <div className="relative z-10 py-8 pb-16">
              <div className="scene flex min-h-[320px] items-center justify-center">
                <span className="text-[0.7rem] uppercase tracking-wider text-white/30">Loading films...</span>
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
      <a href="#main-content" className="sr-only">
        Skip to main content
      </a>
      <ShellGrid>
        <div className="min-h-full" style={{ backgroundColor: "var(--color-bg)" }}>
          <FeedWithComposer>
            <InfinitePostList />
          </FeedWithComposer>
          {SHOW_ONBOARDING_MODAL ? <FeedOnboardingModal /> : null}
        </div>
      </ShellGrid>
    </>
  );
}
