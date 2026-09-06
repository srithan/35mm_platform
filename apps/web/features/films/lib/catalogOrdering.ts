import type { FilmCatalogDisplayItem } from "../api/filmsApi";

export function catalogItemKey(film: FilmCatalogDisplayItem): string {
  return film.tmdbId == null
    ? `35mm:${film.id}`
    : `tmdb:${film.mediaType}:${film.tmdbId}`;
}

export function mergeCatalogSources(
  localFilms: FilmCatalogDisplayItem[],
  tmdbFilms: FilmCatalogDisplayItem[]
): FilmCatalogDisplayItem[] {
  var localByExternalId = new Map<string, FilmCatalogDisplayItem>();
  for (var localFilm of localFilms) {
    if (localFilm.tmdbId != null) localByExternalId.set(catalogItemKey(localFilm), localFilm);
  }

  var included = new Set<string>();
  var merged: FilmCatalogDisplayItem[] = [];
  for (var remoteFilm of tmdbFilms) {
    var key = catalogItemKey(remoteFilm);
    if (included.has(key)) continue;
    included.add(key);
    merged.push(localByExternalId.get(key) ?? remoteFilm);
  }
  for (var localFilm of localFilms) {
    var key = catalogItemKey(localFilm);
    if (included.has(key)) continue;
    included.add(key);
    merged.push(localFilm);
  }
  return merged;
}

export function preserveCatalogOrder(
  previousKeys: string[],
  candidates: FilmCatalogDisplayItem[]
): { keys: string[]; items: FilmCatalogDisplayItem[] } {
  var byKey = new Map<string, FilmCatalogDisplayItem>();
  for (var candidate of candidates) byKey.set(catalogItemKey(candidate), candidate);

  var keys = previousKeys.filter(function (key) { return byKey.has(key); });
  var seen = new Set(keys);
  for (var candidate of candidates) {
    var key = catalogItemKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return {
    keys,
    items: keys.flatMap(function (key) {
      var item = byKey.get(key);
      return item ? [item] : [];
    }),
  };
}
