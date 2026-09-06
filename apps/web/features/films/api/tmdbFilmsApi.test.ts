import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTmdbFilmsCatalog } from "./tmdbFilmsApi";
import type { FilmCatalogFilters } from "./filmsApi";

const DEFAULT_FILTERS: FilmCatalogFilters = {
  q: "",
  sort: "popular",
  mood: "all",
  type: "movie",
  genre: "",
  decade: "",
  language: "",
  duration: "any",
};

afterEach(function () {
  vi.unstubAllGlobals();
});

describe("fetchTmdbFilmsCatalog", function () {
  it("maps TMDB results into source-aware catalog records", async function () {
    var fetchMock = vi.fn(async function () {
      return new Response(JSON.stringify({
        page: 1,
        total_pages: 3,
        total_results: 41,
        results: [{
          id: 12,
          title: "Finding Nemo",
          original_title: "Finding Nemo",
          original_language: "en",
          poster_path: "/nemo.jpg",
          backdrop_path: null,
          overview: "",
          release_date: "2003-05-30",
          vote_average: 8,
          vote_count: 100,
          genre_ids: [16, 10751],
        }],
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    var page = await fetchTmdbFilmsCatalog(DEFAULT_FILTERS, 1);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/tmdb/discover/movie?page=1"),
      { cache: "no-store" }
    );
    expect(page.nextPage).toBe(2);
    expect(page.totalResults).toBe(41);
    expect(page.items[0]).toMatchObject({
      id: "tmdb:movie:12",
      mediaType: "movie",
      tmdbId: 12,
      source: "tmdb",
      title: "Finding Nemo",
      year: 2003,
      language: "en",
      genres: ["Animation", "Family"],
    });
  });

  it("uses TMDB search and forwards active query", async function () {
    var fetchMock = vi.fn(async function () {
      return new Response(JSON.stringify({ page: 1, total_pages: 1, results: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchTmdbFilmsCatalog({ ...DEFAULT_FILTERS, q: "Seven Samurai" }, 1);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/tmdb/search/movie?page=1&include_adult=false&query=Seven+Samurai"),
      { cache: "no-store" }
    );
  });

  it("uses TV discovery and TV-specific filters for web series", async function () {
    var fetchMock = vi.fn(async function () {
      return new Response(JSON.stringify({
        page: 1,
        total_pages: 1,
        total_results: 1,
        results: [{
          id: 1399,
          name: "Game of Thrones",
          original_name: "Game of Thrones",
          original_language: "en",
          poster_path: null,
          backdrop_path: null,
          overview: "",
          first_air_date: "2011-04-17",
          vote_average: 8,
          vote_count: 100,
          genre_ids: [10765, 18],
        }],
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    var page = await fetchTmdbFilmsCatalog({
      ...DEFAULT_FILTERS,
      type: "web_series",
      genre: "Science Fiction",
    }, 1);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/tmdb/discover/tv?page=1"),
      { cache: "no-store" }
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("with_keywords=281372"),
      { cache: "no-store" }
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("with_genres=10765"),
      { cache: "no-store" }
    );
    expect(page.items[0]).toMatchObject({
      id: "tmdb:tv:1399",
      mediaType: "tv",
      year: 2011,
    });
  });

  it("combines movie and TV streams for all titles", async function () {
    var fetchMock = vi.fn(async function (url: string) {
      var isTv = url.includes("/tv?");
      return new Response(JSON.stringify({
        page: 1,
        total_pages: 1,
        total_results: isTv ? 7 : 11,
        results: [],
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    var page = await fetchTmdbFilmsCatalog({ ...DEFAULT_FILTERS, type: "all" }, 1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(page.totalResults).toBe(18);
  });
});
