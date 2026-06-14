import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "Drafts",
  description: "Unpublished posts saved on 35mm.",
  robots: { index: false, follow: false },
};

export default function DraftsPage() {
  return (
    <div className="px-4">
      <EmptyState
        size="lg"
        icon={<FileText size={28} strokeWidth={1.75} />}
        headline="No drafts yet"
        subline="Posts you save before publishing will appear here."
      />
    </div>
  );
}
