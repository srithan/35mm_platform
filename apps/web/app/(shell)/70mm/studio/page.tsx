import type { Metadata } from "next";
import { StudioContent } from "@/features/70mm/components/StudioContent";

export const metadata: Metadata = {
  title: "Creator Studio — 70mm",
  description: "Manage your 70mm film releases, schedules, and visibility.",
  robots: { index: false, follow: false },
};

export default function SeventyMmStudioPage() {
  return <StudioContent />;
}
