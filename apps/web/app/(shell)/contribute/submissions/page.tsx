import type { Metadata } from "next";
import { ContributionSubmissionsPage } from "@/features/contribute/components/ContributionSubmissionsPage";

export const metadata: Metadata = {
  title: "Contribution submissions",
  description: "Track your 35mm catalog contribution submissions.",
};

export default function SubmissionsPage() {
  return <ContributionSubmissionsPage />;
}
