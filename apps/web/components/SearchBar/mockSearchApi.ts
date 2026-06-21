import { ROUTES } from "@/lib/constants/routes";
import type { SearchResult } from "./types";

// ---------------------------------------------------------------------------
// Hardcoded dataset — replaced by real API when backend is ready.
// ---------------------------------------------------------------------------

const MOCK_DATA: Record<string, SearchResult[]> = {
  users: [
    { id: "u-1", label: "Kofi Szabo", sublabel: "@k.szabo", type: "user", initial: "K", imageUrl: null, href: ROUTES.PROFILE("k.szabo") },
    { id: "u-2", label: "Nora Dop", sublabel: "@nora.dop", type: "user", initial: "N", imageUrl: null, href: ROUTES.PROFILE("nora.dop") },
    { id: "u-3", label: "Tariq Osei", sublabel: "@t.osei", type: "user", initial: "T", imageUrl: null, href: ROUTES.PROFILE("t.osei") },
    { id: "u-4", label: "Aisha", sublabel: "@aisha.film", type: "user", initial: "A", imageUrl: "https://i.pravatar.cc/150?u=aisha", href: ROUTES.PROFILE("aisha.film") },
    { id: "u-5", label: "Martin V", sublabel: "@martinv", type: "user", initial: "M", imageUrl: "https://i.pravatar.cc/150?u=martinv", href: ROUTES.PROFILE("martinv") },
  ],
  films: [
    { id: "f-1", label: "Parasite", sublabel: "2019 · Drama · Bong Joon-ho", type: "film", imageUrl: "https://a.ltrbxd.com/resized/film-poster/4/2/6/4/0/6/426406-parasite-0-230-0-345-crop.jpg?v=ca1e1f13b5", href: ROUTES.TITLE("movie", 496243) },
    { id: "f-2", label: "Aftersun", sublabel: "2022 · Drama · Charlotte Wells", type: "film", imageUrl: "https://a.ltrbxd.com/resized/film-poster/7/2/6/2/2/2/726222-aftersun-0-230-0-345-crop.jpg?v=0ba13c4114", href: ROUTES.TITLE("movie", 776503) },
    { id: "f-3", label: "Past Lives", sublabel: "2023 · Drama · Celine Song", type: "film", imageUrl: "https://a.ltrbxd.com/resized/film-poster/5/7/0/8/8/9/570889-past-lives-0-230-0-345-crop.jpg?v=26eb2a297e", href: ROUTES.TITLE("movie", 666277) },
    { id: "f-4", label: "The Substance", sublabel: "2024 · Horror · Coralie Fargeat", type: "film", imageUrl: "https://a.ltrbxd.com/resized/film-poster/8/5/0/5/1/6/850516-the-substance-0-230-0-345-crop.jpg?v=cf3f08f161", href: ROUTES.TITLE("movie", 933260) },
    { id: "f-5", label: "Dune: Part Two", sublabel: "2024 · Sci-Fi · Denis Villeneuve", type: "film", imageUrl: "https://a.ltrbxd.com/resized/film-poster/6/2/5/7/2/2/625722-dune-part-two-0-230-0-345-crop.jpg?v=2d9fb483e4", href: ROUTES.TITLE("movie", 693134) },
    { id: "f-6", label: "Anora", sublabel: "2024 · Drama · Sean Baker", type: "film", imageUrl: "https://www.movieposters.com/cdn/shop/files/anora_zsv5lb9d_1024x1024.jpg?v=1762977642", href: ROUTES.TITLE("movie", 1062722) },
    { id: "f-7", label: "All We Imagine as Light", sublabel: "2024 · Drama · Payal Kapadia", type: "film", imageUrl: "https://a.ltrbxd.com/resized/film-poster/8/6/2/7/2/2/862722-all-we-imagine-as-light-0-230-0-345-crop.jpg?v=efffb08efb", href: ROUTES.TITLE("movie", 639720) },
    { id: "f-8", label: "The Brutalist", sublabel: "2024 · Drama · Brady Corbet", type: "film", imageUrl: "https://m.media-amazon.com/images/M/MV5BM2U0MWRjZTMtMDVhNC00MzY4LTgwOTktZGQ2MDdiYTI4OWMxXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg", href: ROUTES.TITLE("movie", 823452) },
  ],
  hashtags: [
    { id: "h-1", label: "#LetterboxdYourWay", sublabel: "18.2K posts", type: "hashtag", href: ROUTES.DISCOVER_TAG("LetterboxdYourWay") },
    { id: "h-2", label: "#A24", sublabel: "42.6K posts", type: "hashtag", href: ROUTES.DISCOVER_TAG("A24") },
    { id: "h-3", label: "#Oscars2026", sublabel: "9.1K posts", type: "hashtag", href: ROUTES.DISCOVER_TAG("Oscars2026") },
    { id: "h-4", label: "#HorrorMonth", sublabel: "6.8K posts", type: "hashtag", href: ROUTES.DISCOVER_TAG("HorrorMonth") },
    { id: "h-5", label: "#OnePerfectShot", sublabel: "14.3K posts", type: "hashtag", href: ROUTES.DISCOVER_TAG("OnePerfectShot") },
  ],
  posts: [
    { id: "p-1", label: "Just rewatched Parasite and it still floors me every time.", sublabel: "@k.szabo · 2h ago", type: "post", href: ROUTES.POST("k.szabo", "demo-1") },
    { id: "p-2", label: "Aftersun destroyed me. That final shot…", sublabel: "@nora.dop · 5h ago", type: "post", href: ROUTES.POST("nora.dop", "demo-2") },
    { id: "p-3", label: "Hot take: Dune Part Two is the best blockbuster in years.", sublabel: "@t.osei · 1d ago", type: "post", href: ROUTES.POST("t.osei", "demo-3") },
    { id: "p-4", label: "My #A24 ranking after Anora — fight me.", sublabel: "@aisha.film · 1d ago", type: "post", href: ROUTES.POST("aisha.film", "demo-4") },
    { id: "p-5", label: "All We Imagine as Light might be the most beautiful film of the year.", sublabel: "@martinv · 2d ago", type: "post", href: ROUTES.POST("martinv", "demo-5") },
  ],
  communities: [
    { id: "c-1", label: "Bollywood", sublabel: "125K members", type: "community" },
    { id: "c-2", label: "A24 Fans", sublabel: "89K members", type: "community" },
    { id: "c-3", label: "Horror Heads", sublabel: "64K members", type: "community" },
    { id: "c-4", label: "Sci-Fi Cinema", sublabel: "52K members", type: "community" },
    { id: "c-5", label: "Documentary Club", sublabel: "31K members", type: "community" },
    { id: "c-6", label: "Film Photography", sublabel: "22K members", type: "community" },
  ],
  festivals: [
    { id: "fv-1", label: "Cannes Film Festival", sublabel: "France · May 2026", type: "festival" },
    { id: "fv-2", label: "Sundance Film Festival", sublabel: "USA · January 2026", type: "festival" },
    { id: "fv-3", label: "Toronto International Film Festival", sublabel: "Canada · September 2026", type: "festival" },
    { id: "fv-4", label: "Venice Film Festival", sublabel: "Italy · August 2026", type: "festival" },
    { id: "fv-5", label: "Berlin International Film Festival", sublabel: "Germany · February 2026", type: "festival" },
    { id: "fv-6", label: "SXSW Film Festival", sublabel: "USA · March 2026", type: "festival" },
  ],
};

const GLOBAL_SEARCH_DATA: SearchResult[] = [
  ...MOCK_DATA.users,
  ...MOCK_DATA.films,
  ...MOCK_DATA.hashtags,
  ...MOCK_DATA.posts,
];

/** Flat list used when no category is specified. */
const ALL_DATA: SearchResult[] = Object.values(MOCK_DATA).flat();

// ---------------------------------------------------------------------------
// Mock search function — simulates a backend call.
// ---------------------------------------------------------------------------

export interface MockSearchOptions {
  query: string;
  category?: "films" | "communities" | "festivals" | "users" | "all";
  signal?: AbortSignal;
}

/**
 * Searches mock data with a simulated network delay (200–400 ms).
 *
 * Supports `AbortSignal` for cancellation just like `fetch` would.
 * When the backend is ready, replace calls to this function with real
 * `fetch`/TanStack Query calls — the return shape stays the same.
 */
export async function mockSearch({
  query,
  category,
  signal,
}: MockSearchOptions): Promise<SearchResult[]> {
  const delay = 200 + Math.random() * 200;

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, delay);

    signal?.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

  const dataset =
    category === "all"
      ? GLOBAL_SEARCH_DATA
      : category
        ? (MOCK_DATA[category] ?? ALL_DATA)
        : ALL_DATA;
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return [];

  const withoutHash = normalizedQuery.startsWith("#")
    ? normalizedQuery.slice(1)
    : normalizedQuery;

  return dataset.filter((item) => {
    const label = item.label.toLowerCase();
    const sublabel = item.sublabel?.toLowerCase() ?? "";
    return (
      label.includes(normalizedQuery) ||
      label.includes(withoutHash) ||
      sublabel.includes(normalizedQuery) ||
      sublabel.includes(withoutHash)
    );
  });
}
