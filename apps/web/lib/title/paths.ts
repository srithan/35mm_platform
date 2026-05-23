import { ROUTES } from "@/lib/constants/routes";
import type { TMDBMovie } from "@/lib/tmdb/types";

export type TitleMedia = "movie" | "tv";

/**
 * Resolves 35mm title URL from a TMDB list/search item (inference when `media_type` is missing).
 * Non–movie/tv (e.g. `person` from search/multi) should not be routed here; falls back to Discover.
 */
export function tmdbItemToTitlePath(
  item: Pick<TMDBMovie, "id" | "name" | "title" | "media_type">
): string {
  const rawMt = item.media_type as string | undefined;
  if (rawMt && rawMt !== "movie" && rawMt !== "tv") {
    return ROUTES.DISCOVER;
  }
  const media: TitleMedia = inferTitleMedia(item);
  return ROUTES.TITLE(media, item.id);
}

export function inferTitleMedia(
  item: Pick<TMDBMovie, "name" | "title" | "media_type">
): TitleMedia {
  if (item.media_type === "tv") return "tv";
  if (item.media_type === "movie") return "movie";
  if (item.name && !item.title) return "tv";
  if (item.title && !item.name) return "movie";
  return "movie";
}

export function isTitleMedia(s: string): s is TitleMedia {
  return s === "movie" || s === "tv";
}
