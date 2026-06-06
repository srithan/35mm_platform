import type { Metadata } from "next";
import { ShellGrid } from "@/components/layout/ShellGrid";
import { ScrollRestore } from "@/features/feed/components/FeedScrollRestore";
import { FeedWithComposer } from "@/features/feed/components/FeedWithComposer";
import { InfinitePostList } from "@/features/feed/components/InfinitePostList";
import { OnboardingGate } from "@/features/onboarding/components/OnboardingGate";

export const metadata: Metadata = {
  title: "35mm",
  description:
    "Your feed. Films, reviews, and updates from filmmakers you follow.",
  openGraph: {
    title: "35mm",
    description:
      "Your feed. Films, reviews, and updates from filmmakers you follow.",
  },
  twitter: {
    title: "35mm",
    description:
      "Your feed. Films, reviews, and updates from filmmakers you follow.",
  },
};

export default function RootPage() {
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
