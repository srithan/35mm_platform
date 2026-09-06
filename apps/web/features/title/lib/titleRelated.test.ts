import { describe, expect, it } from "vitest";
import type { TMDBMovie } from "@/lib/tmdb/types";
import {
  RELATED_TITLE_LIMIT,
  genreIdsFromTitle,
  selectRelatedTitles,
} from "./titleRelated";

function movie(partial: Partial<TMDBMovie> & Pick<TMDBMovie, "id" | "title">): TMDBMovie {
  return {
    poster_path: "/poster.jpg",
    backdrop_path: null,
    overview: "",
    vote_average: 7.4,
    vote_count: 1200,
    popularity: 40,
    genre_ids: [18, 53],
    original_language: "en",
    media_type: "movie",
    ...partial,
  };
}

const context = {
  id: 1,
  mediaType: "movie" as const,
  genreIds: [18, 53],
  originalLanguage: "en",
};

describe("genreIdsFromTitle", function () {
  it("prefers genre_ids and falls back to genres", function () {
    expect(
      genreIdsFromTitle({ genre_ids: [18, 18, 53], genres: [{ id: 99, name: "Other" }] }),
    ).toEqual([18, 53]);
    expect(
      genreIdsFromTitle({ genres: [{ id: 28, name: "Action" }, { id: 12, name: "Adventure" }] }),
    ).toEqual([28, 12]);
  });
});

describe("selectRelatedTitles", function () {
  it("drops the source title, adult titles, and posters-less rows", function () {
    const related = selectRelatedTitles(context, [
      movie({ id: 1, title: "Self" }),
      movie({ id: 2, title: "Adult", adult: true }),
      movie({ id: 3, title: "No art", poster_path: null }),
      movie({ id: 4, title: "Keep" }),
    ], []);

    expect(related.map(function (item) {
      return item.id;
    })).toEqual([4]);
  });

  it("dedupes recommendations over similar and stamps the page media type", function () {
    const related = selectRelatedTitles(context, [
      movie({ id: 10, title: "Shared rec", media_type: undefined }),
    ], [
      movie({ id: 10, title: "Shared similar", vote_count: 9000 }),
      movie({ id: 11, title: "Only similar", vote_count: 800 }),
    ]);

    expect(related.map(function (item) {
      return item.id;
    })).toEqual([10, 11]);
    expect(related[0].title).toBe("Shared rec");
    expect(related[0].media_type).toBe("movie");
  });

  it("fills with similar when recommendations are thin", function () {
    const related = selectRelatedTitles(
      context,
      [movie({ id: 20, title: "Rec" })],
      [
        movie({ id: 21, title: "Similar A", vote_count: 400 }),
        movie({ id: 22, title: "Similar B", vote_count: 350 }),
      ],
    );

    expect(related.map(function (item) {
      return item.id;
    })).toEqual([20, 21, 22]);
  });

  it("lets a strong similar title outrank a weak recommendation", function () {
    const related = selectRelatedTitles(
      context,
      [
        movie({
          id: 30,
          title: "Weak rec",
          genre_ids: [99],
          vote_average: 4.1,
          vote_count: 8,
          popularity: 1,
          original_language: "xx",
        }),
      ],
      [
        movie({
          id: 31,
          title: "Strong similar",
          genre_ids: [18, 53],
          vote_average: 8.2,
          vote_count: 18000,
          popularity: 90,
        }),
      ],
    );

    expect(related[0].id).toBe(31);
    expect(related[1].id).toBe(30);
  });

  it("skips similar titles with too few votes", function () {
    const related = selectRelatedTitles(
      context,
      [],
      [movie({ id: 40, title: "Obscure match", vote_count: 3 })],
    );

    expect(related).toEqual([]);
  });

  it("caps the shelf at RELATED_TITLE_LIMIT", function () {
    const recs: TMDBMovie[] = [];
    for (let i = 0; i < RELATED_TITLE_LIMIT + 8; i++) {
      recs.push(movie({ id: 100 + i, title: "Rec " + i, vote_count: 500 + i }));
    }

    expect(selectRelatedTitles(context, recs, [])).toHaveLength(RELATED_TITLE_LIMIT);
  });
});
