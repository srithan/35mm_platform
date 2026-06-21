import { Film, Hash, Sparkles, UserRound } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import type { SearchQuickLink, SearchTrendingPill } from "./types";

export const TRENDING_PILLS: SearchTrendingPill[] = [
  { id: "pill-aftersun", label: "Aftersun", query: "Aftersun" },
  { id: "pill-anora", label: "Anora", query: "Anora" },
  { id: "pill-oscars", label: "#Oscars2026", query: "#Oscars2026" },
  { id: "pill-a24", label: "#A24", query: "#A24" },
  { id: "pill-horror", label: "Horror", query: "Horror" },
  { id: "pill-villeneuve", label: "Denis Villeneuve", query: "Denis Villeneuve" },
];

export const QUICK_LINKS: SearchQuickLink[] = [
  {
    id: "quick-discover",
    label: "Discover films",
    sublabel: "Browse trending & new releases",
    href: ROUTES.DISCOVER,
    icon: Film,
  },
  {
    id: "quick-people",
    label: "People to follow",
    sublabel: "Curated suggestions for you",
    href: ROUTES.SUGGESTIONS_PEOPLE,
    icon: UserRound,
  },
  {
    id: "quick-trending",
    label: "Trending tags",
    sublabel: "See what the community is talking about",
    href: ROUTES.DISCOVER_TAG("LetterboxdYourWay"),
    icon: Hash,
  },
  {
    id: "quick-spotlight",
    label: "Editor's picks",
    sublabel: "Hand-selected films this week",
    href: ROUTES.DISCOVER,
    icon: Sparkles,
  },
];

export const RESULT_GROUP_LABELS: Record<string, string> = {
  user: "People",
  film: "Films",
  hashtag: "Hashtags",
  post: "Posts",
};

export const RESULT_GROUP_ORDER = ["user", "film", "hashtag", "post"] as const;
