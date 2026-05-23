import { TMDB_IMAGE_BASE, TMDB_POSTER_SIZE, TMDB_HERO_SIZE } from "@/lib/tmdb/constants";

export function posterUrl(path: string | null, size = TMDB_POSTER_SIZE): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function heroUrl(path: string | null): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${TMDB_HERO_SIZE}${path}`;
}

/** Convert vote_average (0-10) to 5-star scale */
export function starsFromVote(voteAverage: number): number {
  return Math.round((voteAverage / 2) * 10) / 10; // e.g. 8.5 -> 4.25, round to 1 decimal
}

export function yearFromDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 4);
}
