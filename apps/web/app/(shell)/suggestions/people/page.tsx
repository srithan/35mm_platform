import type { Metadata } from "next";
import { PeopleSuggestionsPage } from "@/features/suggestions";

export const metadata: Metadata = {
  title: "People Suggestions | 35mm",
  description: "Find filmmakers, critics, programmers, and film lovers to follow on 35mm.",
};

export default function SuggestionsPeopleRoute() {
  return <PeopleSuggestionsPage />;
}
