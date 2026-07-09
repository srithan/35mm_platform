import type { Metadata } from "next";
import { ContributorHub } from "@/features/contribute/components/ContributorHub";

export const metadata: Metadata = {
  title: "Contribute",
  description: "Submit catalog contributions to 35mm.",
};

export default function ContributePage() {
  return <ContributorHub />;
}
