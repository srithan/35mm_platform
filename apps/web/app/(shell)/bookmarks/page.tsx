import type { Metadata } from "next";
import { BookmarksPageContent } from "@/features/bookmarks/components/BookmarksPageContent";

export const metadata: Metadata = {
  title: "Bookmarks",
  description: "Saved posts organized in folders on 35mm.",
  robots: { index: false, follow: false },
};

export default function BookmarksPage() {
  return <BookmarksPageContent />;
}
