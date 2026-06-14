import type { Metadata } from "next";
import { ShortFilmsContent } from "@/features/short-films";

export const metadata: Metadata = {
  title: "Watch Free Videos, Films, and Shorts - No Ads",
  description:
    "Explore free online videos, films, shorts, documentaries, and more, all streaming in HD. Discover comedy, documentaries, animation, drama, Staff Picks, and more videos.",
  openGraph: {
    title: "Watch Free Videos, Films, and Shorts - No Ads",
    description:
      "Explore free online videos, films, shorts, documentaries, and more, all streaming in HD. Discover comedy, documentaries, animation, drama, Staff Picks, and more videos.",
  },
};

export default function ShortFilmsPage() {
  return <ShortFilmsContent />;
}
