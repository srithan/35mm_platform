import { describe, expect, it } from "vitest";
import type { FilmCatalogDisplayItem } from "../api/filmsApi";
import { catalogItemKey, mergeCatalogSources, preserveCatalogOrder } from "./catalogOrdering";

function film(
  id: string,
  source: "35mm" | "tmdb",
  tmdbId: number | null
): FilmCatalogDisplayItem {
  return {
    id,
    tmdbId,
    mediaType: "movie",
    title: id,
    originalTitle: null,
    year: 2025,
    runtime: null,
    posterUrl: null,
    genres: [],
    director: null,
    language: null,
    country: null,
    isVerified: source === "35mm",
    source,
  };
}

describe("catalog ordering", function () {
  it("keeps TMDB rank while substituting canonical 35mm identity", function () {
    var local = film("01LOCAL", "35mm", 2);
    var remoteFirst = film("tmdb:movie:1", "tmdb", 1);
    var remoteCanonical = film("tmdb:movie:2", "tmdb", 2);

    expect(mergeCatalogSources([local], [remoteFirst, remoteCanonical]).map(function (item) { return item.id; }))
      .toEqual(["tmdb:movie:1", "01LOCAL"]);
  });

  it("appends newly fetched titles without rearranging rendered titles", function () {
    var first = film("tmdb:movie:1", "tmdb", 1);
    var local = film("01LOCAL", "35mm", 2);
    var laterRemote = film("tmdb:movie:3", "tmdb", 3);
    var previous = [catalogItemKey(first), catalogItemKey(local)];

    var result = preserveCatalogOrder(previous, [first, laterRemote, local]);

    expect(result.items.map(function (item) { return item.id; }))
      .toEqual(["tmdb:movie:1", "01LOCAL", "tmdb:movie:3"]);
  });
});
