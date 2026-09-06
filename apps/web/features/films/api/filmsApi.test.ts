import { describe, expect, it, vi } from "vitest";
import { fetchFilmsCatalog } from "./filmsApi";

vi.mock("@/features/feed/api/http", function () {
  return { apiRequest: vi.fn(async function (path: string) { return path; }) };
});

describe("fetchFilmsCatalog", function () {
  it("serializes active filters and cursor without default noise", async function () {
    var result = await fetchFilmsCatalog({
      q: "Kurosawa",
      sort: "year_desc",
      mood: "think",
      type: "documentary",
      genre: "History",
      decade: "1950",
      language: "ja",
      duration: "over_120",
    }, "next-page");

    expect(result).toContain("/v1/films?");
    expect(result).toContain("q=Kurosawa");
    expect(result).toContain("sort=year_desc");
    expect(result).toContain("mood=think");
    expect(result).toContain("type=documentary");
    expect(result).toContain("genre=History");
    expect(result).toContain("decade=1950");
    expect(result).toContain("language=ja");
    expect(result).toContain("duration=over_120");
    expect(result).toContain("cursor=next-page");
  });

  it("omits default filters", async function () {
    var result = await fetchFilmsCatalog({
      q: "",
      sort: "popular",
      mood: "all",
      type: "all",
      genre: "",
      decade: "",
      language: "",
      duration: "any",
    });

    expect(result).toBe("/v1/films?limit=48");
  });
});
