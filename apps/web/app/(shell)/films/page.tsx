import type { Metadata } from "next";
import { FilmsContent } from "@/features/films/components/FilmsContent";

export const metadata: Metadata = {
  title: "Films",
  description: "Search, sort, and filter the 35mm film catalog.",
};

export default function FilmsPage() {
  return <FilmsContent />;
}
