import type { Metadata } from "next";
import { ShellGrid } from "@/components/layout/ShellGrid";
import { ScrollRestore } from "@/features/feed/components/FeedScrollRestore";
import { FeedWithComposer } from "@/features/feed/components/FeedWithComposer";
import { InfinitePostList } from "@/features/feed/components/InfinitePostList";
import { LandingPage } from "@/features/landing/components/LandingPage";
import { OnboardingGate } from "@/features/onboarding/components/OnboardingGate";
import { getIsAuthenticated } from "@/lib/auth";

export const metadata: Metadata = {
  title: "35mm",
  description:
    "35mm is a social network for film lovers to follow friends, critics, and filmmakers.",
  openGraph: {
    title: "35mm",
    description:
      "Watch films. Find your people on 35mm.",
  },
  twitter: {
    title: "35mm",
    description:
      "Watch films. Find your people on 35mm.",
  },
};

export default async function RootPage() {
  const isAuthenticated = await getIsAuthenticated();

  if (!isAuthenticated) {
    return <LandingPage />;
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
