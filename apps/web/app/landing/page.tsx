import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/components/LandingPage";

export const metadata: Metadata = {
  title: "35mm.in — A Social Network for Cinema",
  description:
    "Share what you make, talk about what moves you, and discover films, ideas, and people from every part of cinema.",
};

export default function LandingRoutePage() {
  return <LandingPage />;
}
