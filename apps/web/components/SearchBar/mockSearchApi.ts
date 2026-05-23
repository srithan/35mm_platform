import type { SearchResult } from "./types";

// ---------------------------------------------------------------------------
// Hardcoded dataset — replaced by real API when backend is ready.
// ---------------------------------------------------------------------------

const MOCK_DATA: Record<string, SearchResult[]> = {
  users: [
    { id: "u-1", label: "Kofi Szabo", sublabel: "@k.szabo", type: "user", initial: "K", imageUrl: null },
    { id: "u-2", label: "Nora Dop", sublabel: "@nora.dop", type: "user", initial: "N", imageUrl: null },
    { id: "u-3", label: "Tariq Osei", sublabel: "@t.osei", type: "user", initial: "T", imageUrl: null },
    { id: "u-4", label: "Aisha", sublabel: "@aisha.film", type: "user", initial: "A", imageUrl: "https://i.pravatar.cc/150?u=aisha" },
    { id: "u-5", label: "Martin V", sublabel: "@martinv", type: "user", initial: "M", imageUrl: "https://i.pravatar.cc/150?u=martinv" },
  ],
  films: [
    { id: "f-1", label: "Parasite", sublabel: "2019 · Drama · Bong Joon-ho", type: "film", imageUrl: "https://a.ltrbxd.com/resized/film-poster/4/2/6/4/0/6/426406-parasite-0-230-0-345-crop.jpg?v=ca1e1f13b5" },
    { id: "f-2", label: "Aftersun", sublabel: "2022 · Drama · Charlotte Wells", type: "film", imageUrl: "https://a.ltrbxd.com/resized/film-poster/7/2/6/2/2/2/726222-aftersun-0-230-0-345-crop.jpg?v=0ba13c4114" },
    { id: "f-3", label: "Past Lives", sublabel: "2023 · Drama · Celine Song", type: "film", imageUrl: "https://a.ltrbxd.com/resized/film-poster/5/7/0/8/8/9/570889-past-lives-0-230-0-345-crop.jpg?v=26eb2a297e" },
    { id: "f-4", label: "The Substance", sublabel: "2024 · Horror · Coralie Fargeat", type: "film", imageUrl: "https://a.ltrbxd.com/resized/film-poster/8/5/0/5/1/6/850516-the-substance-0-230-0-345-crop.jpg?v=cf3f08f161" },
    { id: "f-5", label: "Dune: Part Two", sublabel: "2024 · Sci-Fi · Denis Villeneuve", type: "film", imageUrl: "https://a.ltrbxd.com/resized/film-poster/6/2/5/7/2/2/625722-dune-part-two-0-230-0-345-crop.jpg?v=2d9fb483e4" },
    { id: "f-6", label: "Anora", sublabel: "2024 · Drama · Sean Baker", type: "film", imageUrl: "https://www.movieposters.com/cdn/shop/files/anora_zsv5lb9d_1024x1024.jpg?v=1762977642" },
    { id: "f-7", label: "All We Imagine as Light", sublabel: "2024 · Drama · Payal Kapadia", type: "film", imageUrl: "https://a.ltrbxd.com/resized/film-poster/8/6/2/7/2/2/862722-all-we-imagine-as-light-0-230-0-345-crop.jpg?v=efffb08efb" },
    { id: "f-8", label: "The Brutalist", sublabel: "2024 · Drama · Brady Corbet", type: "film", imageUrl: "https://m.media-amazon.com/images/M/MV5BM2U0MWRjZTMtMDVhNC00MzY4LTgwOTktZGQ2MDdiYTI4OWMxXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
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

  const dataset = category ? (MOCK_DATA[category] ?? ALL_DATA) : ALL_DATA;
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return [];

  return dataset.filter(
    (item) =>
      item.label.toLowerCase().includes(normalizedQuery) ||
      item.sublabel?.toLowerCase().includes(normalizedQuery),
  );
}
