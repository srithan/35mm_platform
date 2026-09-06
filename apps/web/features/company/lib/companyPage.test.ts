import { describe, expect, it } from "vitest";
import {
  mergeCompanyTitles,
  parseCompanyDetail,
  parseCompanyTitles,
  type CompanyTitle,
} from "./companyPage";

describe("parseCompanyDetail", function () {
  it("keeps a valid company and rejects a non-http homepage", function () {
    const company = parseCompanyDetail({
      id: 174,
      name: "Warner Bros. Pictures",
      description: "Studio",
      headquarters: "Burbank",
      homepage: "javascript:alert(1)",
      logo_path: "/logo.png",
      origin_country: "US",
      parent_company: { id: 17, name: "Warner Bros." },
    });

    expect(company).toMatchObject({
      id: 174,
      name: "Warner Bros. Pictures",
      homepage: "",
      parent_company: { id: 17, name: "Warner Bros." },
    });
  });

  it("returns null without a name or id", function () {
    expect(parseCompanyDetail({ id: 1 })).toBeNull();
    expect(parseCompanyDetail({ name: "Studio" })).toBeNull();
  });
});

describe("parseCompanyTitles", function () {
  it("keeps numbered titles and drops nameless rows", function () {
    const titles = parseCompanyTitles(
      {
        results: [
          { id: 1, title: "Inception", poster_path: "/a.jpg", popularity: 80 },
          { id: 2, poster_path: "/b.jpg", popularity: 10 },
          { id: "nope", title: "Bad" },
        ],
      },
      "movie",
    );

    expect(titles).toHaveLength(1);
    expect(titles[0]).toMatchObject({
      id: 1,
      title: "Inception",
      media_type: "movie",
    });
  });
});

describe("mergeCompanyTitles", function () {
  it("sorts by popularity, dedupes, and respects the cap", function () {
    const movies: CompanyTitle[] = [
      {
        id: 1,
        title: "A",
        media_type: "movie",
        poster_path: null,
        popularity: 10,
      },
      {
        id: 2,
        title: "B",
        media_type: "movie",
        poster_path: null,
        popularity: 30,
      },
    ];
    const shows: CompanyTitle[] = [
      {
        id: 2,
        name: "B Show",
        media_type: "tv",
        poster_path: null,
        popularity: 40,
      },
      {
        id: 1,
        title: "A again",
        media_type: "movie",
        poster_path: null,
        popularity: 99,
      },
    ];

    expect(
      mergeCompanyTitles(movies, shows, 2).map(function (title) {
        return title.media_type + ":" + title.id;
      }),
    ).toEqual(["movie:1", "tv:2"]);
  });
});
