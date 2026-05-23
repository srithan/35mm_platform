import type { TMDBMedia } from "@/lib/tmdb/types";

export function titleKindLabel(detail: TMDBMedia, isTv: boolean): string {
  if (isTv) return "Series";
  if ((detail.genres || []).some(function (g) {
    return g.id === 99;
  })) {
    return "Documentary";
  }
  if (
    detail.runtime != null &&
    detail.runtime > 0 &&
    detail.runtime <= 50
  ) {
    return "Short";
  }
  return "Film";
}
