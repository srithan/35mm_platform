import { TMDB_IMAGE_BASE } from "@/lib/tmdb/constants";
import { heroUrl } from "@/features/discover/lib/tmdb-utils";

export function titleHeroBackdropUrl(path: string | null): string | null {
  if (!path) return null;
  return TMDB_IMAGE_BASE + "/w1280" + path;
}

export function titleHeroImageUrl(
  backdrop: string | null,
  poster: string | null
): string | null {
  if (backdrop) return titleHeroBackdropUrl(backdrop);
  if (poster) return heroUrl(poster);
  return null;
}
