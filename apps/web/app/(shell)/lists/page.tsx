import type { Metadata } from "next";
import { PublicListsPageContent } from "@/features/lists/components/PublicListsPageContent";

export const metadata: Metadata = {
  title: "Lists",
  description: "Browse public film lists curated by the 35mm community.",
};

export default function ListsPage() {
  return <PublicListsPageContent />;
}
