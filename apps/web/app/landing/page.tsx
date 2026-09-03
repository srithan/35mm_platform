import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/components/LandingPage";

export const metadata: Metadata = {
  title: "35mm.in — The Social Network for Film",
  description:
    "35mm is a social network for directors, critics, and film lovers — log films, follow people you trust, and talk about cinema.",
};

export default function LandingRoutePage() {
  return <LandingPage />;
}
