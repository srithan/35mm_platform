/**
 * Preset “vibe” filters for Discover. Maps to TMDB discover query params
 * (with_genres uses | for OR; combined with user genre via comma = AND).
 */

export type DiscoverMoodId =
  | "all"
  | "light"
  | "cry"
  | "edge"
  | "think"
  | "short"
  | "late"
  | "together";

export type DiscoverMoodDiscoverParams = {
  with_genres: string | null;
  /** TMDB uses with_runtime.lte */
  with_runtime_lte: number | null;
};

const MOOD_DISCOVER: Record<
  Exclude<DiscoverMoodId, "all">,
  DiscoverMoodDiscoverParams
> = {
  light: {
    with_genres: "35|10749|16",
    with_runtime_lte: null,
  },
  cry: {
    with_genres: "18|10751",
    with_runtime_lte: null,
  },
  edge: {
    with_genres: "53|27|80",
    with_runtime_lte: null,
  },
  think: {
    with_genres: "9648|99|878",
    with_runtime_lte: null,
  },
  short: {
    with_genres: null,
    with_runtime_lte: 90,
  },
  late: {
    with_genres: "27|53|9648",
    with_runtime_lte: null,
  },
  together: {
    with_genres: "10749|10751|35",
    with_runtime_lte: null,
  },
};

export function getMoodDiscoverParams(
  moodId: DiscoverMoodId
): DiscoverMoodDiscoverParams | null {
  if (moodId === "all") return null;
  return MOOD_DISCOVER[moodId];
}

/**
 * Single with_genres value for discover: mood cluster (OR) AND optional user genre.
 */
export function buildDiscoverWithGenres(
  moodId: DiscoverMoodId,
  genreId: number | null
): string | null {
  const mood = getMoodDiscoverParams(moodId);
  const moodGenres = mood && mood.with_genres ? mood.with_genres : null;
  if (!genreId) return moodGenres;
  if (!moodGenres) return String(genreId);
  return moodGenres + "," + String(genreId);
}

export const DISCOVER_MOOD_OPTIONS: { id: DiscoverMoodId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "light", label: "😌 Light" },
  { id: "cry", label: "😭 Good cry" },
  { id: "edge", label: "😱 On edge" },
  { id: "think", label: "🧠 Think" },
  { id: "short", label: "⏱ Under 90m" },
  { id: "late", label: "🌙 Late night" },
  { id: "together", label: "👫 Together" },
];
