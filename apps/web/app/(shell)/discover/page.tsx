import type { Metadata } from "next";
import { DiscoverContent } from "@/features/discover/components/DiscoverContent";

export const metadata: Metadata = {
  title: "Discover",
  description:
    "Explore trending films, emerging directors, and filmmakers from around the world.",
  openGraph: {
    title: "Discover",
    description:
      "Explore trending films, emerging directors, and filmmakers from around the world.",
  },
};

export default function DiscoverPage() {
  return <DiscoverContent />;
}
