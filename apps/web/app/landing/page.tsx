import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingPage } from "@/features/landing/components/LandingPage";
import { LandingCarousel } from "@/features/landing/components/LandingCarousel";

export const metadata: Metadata = {
  title: "35mm.in — The Social Network for Cinema",
  description:
    "Log films. Follow directors and DPs. Debate cuts at 2am. Discover festivals, shorts, and the people who actually care about movies.",
};

export default function LandingRoutePage() {
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
