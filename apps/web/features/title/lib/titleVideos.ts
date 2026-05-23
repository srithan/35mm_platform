import type { TMDBVideo } from "@/lib/tmdb/types";

export function sortVideosForDisplay(v: TMDBVideo[]): TMDBVideo[] {
  const y = v.filter(function (x) {
    return x.site === "YouTube" && x.key;
  });
  const rank = function (x: TMDBVideo) {
    const t = (x.type || "") + (x.name || "");
    if (/trailer/i.test(t)) return 0;
    if (/teaser/i.test(t)) return 1;
    if (/clip|featurette|behind|bts/i.test(t)) return 2;
    return 3;
  };
  return y
    .slice()
    .sort(function (a, b) {
      return rank(a) - rank(b) || (a.name || "").localeCompare(b.name || "");
    });
}

export function youtubeThumb(key: string): string {
  return "https://img.youtube.com/vi/" + key + "/hqdefault.jpg";
}
