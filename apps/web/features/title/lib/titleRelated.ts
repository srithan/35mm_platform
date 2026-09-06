import type { TMDBMovie } from "@/lib/tmdb/types";
import type { TitleMedia } from "@/lib/title/paths";

/** Four desktop rows in the 4-column More like this grid. */
export const RELATED_TITLE_LIMIT = 16;

const MIN_SIMILAR_VOTE_COUNT = 20;

export type RelatedTitleContext = {
  id: number;
  mediaType: TitleMedia;
  genreIds: number[];
  originalLanguage?: string;
};

type RankedRelatedTitle = {
  item: TMDBMovie;
  fromRecommendations: boolean;
  score: number;
  order: number;
};

export function genreIdsFromTitle(
  detail: Pick<TMDBMovie, "genre_ids" | "genres">,
): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();

  if (Array.isArray(detail.genre_ids)) {
    for (let i = 0; i < detail.genre_ids.length; i++) {
      const id = detail.genre_ids[i];
      if (typeof id === "number" && Number.isFinite(id) && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }

  if (ids.length === 0 && Array.isArray(detail.genres)) {
    for (let i = 0; i < detail.genres.length; i++) {
      const id = detail.genres[i]?.id;
      if (typeof id === "number" && Number.isFinite(id) && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }

  return ids;
}

function itemGenreIds(item: TMDBMovie): number[] {
  return genreIdsFromTitle(item);
}

function hasTitle(item: TMDBMovie): boolean {
  return Boolean((item.title && item.title.trim()) || (item.name && item.name.trim()));
}

function isUsableRelated(
  item: TMDBMovie,
  context: RelatedTitleContext,
  fromRecommendations: boolean,
): boolean {
  if (typeof item.id !== "number" || !Number.isFinite(item.id) || item.id <= 0) {
    return false;
  }
  if (item.id === context.id) return false;
  if (!item.poster_path) return false;
  if (!hasTitle(item)) return false;
  if (item.adult === true) return false;
  if (item.media_type && item.media_type !== context.mediaType) return false;
  if (!fromRecommendations && (item.vote_count || 0) < MIN_SIMILAR_VOTE_COUNT) {
    return false;
  }
  return true;
}

function genreOverlap(item: TMDBMovie, sourceGenreIds: number[]): number {
  if (sourceGenreIds.length === 0) return 0;
  const ids = itemGenreIds(item);
  let overlap = 0;
  for (let i = 0; i < ids.length; i++) {
    if (sourceGenreIds.indexOf(ids[i]) !== -1) overlap += 1;
  }
  return overlap;
}

function relatedScore(
  item: TMDBMovie,
  context: RelatedTitleContext,
  fromRecommendations: boolean,
): number {
  const overlap = genreOverlap(item, context.genreIds);
  const overlapRatio =
    context.genreIds.length > 0
      ? overlap / Math.min(context.genreIds.length, 4)
      : 0;
  const votes = Math.max(0, item.vote_count || 0);
  const rating = Math.max(0, item.vote_average || 0);
  const popularity = Math.max(0, item.popularity || 0);
  const voteWeight = Math.min(Math.log10(votes + 1) * 28, 110);
  const ratingWeight = rating >= 6 ? rating * 6 : rating * 2;
  const popularityWeight = Math.min(popularity / 25, 35);
  const languageBonus =
    context.originalLanguage &&
    item.original_language &&
    item.original_language === context.originalLanguage
      ? 25
      : 0;

  return (
    (fromRecommendations ? 180 : 0) +
    overlap * 55 +
    overlapRatio * 40 +
    voteWeight +
    ratingWeight +
    popularityWeight +
    languageBonus
  );
}

function stampMediaType(item: TMDBMovie, mediaType: TitleMedia): TMDBMovie {
  if (item.media_type === mediaType) return item;
  return { ...item, media_type: mediaType };
}

/**
 * Merge TMDB recommendations (primary) with similar titles (fill), then rank.
 * Recs keep a score boost; similar with strong genre overlap / votes can still
 * outrank a weak rec. Dedupes by TMDB id and drops the source title.
 */
export function selectRelatedTitles(
  context: RelatedTitleContext,
  recommendations: TMDBMovie[],
  similar: TMDBMovie[],
  limit: number = RELATED_TITLE_LIMIT,
): TMDBMovie[] {
  const ranked = new Map<number, RankedRelatedTitle>();
  let order = 0;

  function consider(item: TMDBMovie, fromRecommendations: boolean) {
    if (!isUsableRelated(item, context, fromRecommendations)) return;
    const existing = ranked.get(item.id);
    const candidate: RankedRelatedTitle = {
      item: stampMediaType(item, context.mediaType),
      fromRecommendations: fromRecommendations,
      score: relatedScore(item, context, fromRecommendations),
      order: order++,
    };
    if (!existing) {
      ranked.set(item.id, candidate);
      return;
    }
    if (fromRecommendations && !existing.fromRecommendations) {
      ranked.set(item.id, candidate);
      return;
    }
    if (candidate.score > existing.score) {
      ranked.set(item.id, candidate);
    }
  }

  for (let i = 0; i < recommendations.length; i++) {
    consider(recommendations[i], true);
  }
  for (let i = 0; i < similar.length; i++) {
    consider(similar[i], false);
  }

  const selected: RankedRelatedTitle[] = [];
  ranked.forEach(function (entry) {
    selected.push(entry);
  });
  selected.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return a.order - b.order;
  });

  const cap = Math.max(0, limit);
  const result: TMDBMovie[] = [];
  for (let i = 0; i < selected.length && result.length < cap; i++) {
    result.push(selected[i].item);
  }
  return result;
}
