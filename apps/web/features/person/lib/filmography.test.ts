import { describe, expect, it } from "vitest";
import {
  buildFilmographyDecades,
  buildFilmographyDepartments,
  buildFilmographyGenres,
  constrainFilmographyFilters,
  filterAndSortFilmographyCredits,
  filmographyHeadingPrefix,
  filmographyPageTitle,
  filmographyRoleLabel,
  parseFilmographyFilters,
} from "./filmography";

describe("filmography headings", function () {
  it("uses role-specific film language", function () {
    expect(filmographyHeadingPrefix("Acting")).toBe("Films starring");
    expect(filmographyHeadingPrefix("Production")).toBe("Films produced by");
    expect(filmographyHeadingPrefix("Directing")).toBe("Films directed by");
    expect(filmographyPageTitle("Writing", "Suriya")).toBe(
      "Films written by Suriya",
    );
    expect(filmographyRoleLabel("Acting")).toBe("Actor");
    expect(filmographyRoleLabel("Production")).toBe("Producer");
  });

  it("uses a safe contribution label for unknown departments", function () {
    expect(filmographyPageTitle("Unknown", "Suriya")).toBe(
      "Films featuring work by Suriya",
    );
  });
});

describe("buildFilmographyDepartments", function () {
  it("keeps one title in each contributed department and merges roles within a department", function () {
    const departments = buildFilmographyDepartments({
      knownForDepartment: "Acting",
      movieCredits: {
        cast: [
          {
            id: 10,
            title: "Shared Film",
            character: "Lead",
            poster_path: null,
            release_date: "2024-01-01",
          },
        ],
        crew: [
          {
            id: 10,
            title: "Shared Film",
            department: "Production",
            job: "Producer",
            poster_path: null,
            release_date: "2024-01-01",
          },
          {
            id: 10,
            title: "Shared Film",
            department: "Production",
            job: "Executive Producer",
            poster_path: "/shared.jpg",
            release_date: "2024-01-01",
          },
        ],
      },
    });

    expect(departments.map((department) => department.label)).toEqual([
      "Acting",
      "Production",
    ]);
    expect(departments.map((department) => department.slug)).toEqual([
      "actor",
      "producer",
    ]);
    expect(departments[0]?.items[0]?.roles).toEqual(["Lead"]);
    expect(departments[1]?.items).toHaveLength(1);
    expect(departments[1]?.items[0]?.roles).toEqual([
      "Producer",
      "Executive Producer",
    ]);
    expect(departments[1]?.items[0]?.poster_path).toBe("/shared.jpg");
  });

  it("keeps movie and TV credits with the same provider id separate", function () {
    const departments = buildFilmographyDepartments({
      movieCredits: {
        crew: [
          {
            id: 7,
            title: "Movie Seven",
            department: "Directing",
            job: "Director",
            poster_path: null,
          },
        ],
      },
      tvCredits: {
        crew: [
          {
            id: 7,
            name: "Series Seven",
            department: "Directing",
            job: "Director",
            poster_path: null,
          },
        ],
      },
    });

    expect(departments[0]?.items.map((credit) => credit.media_type)).toEqual([
      "movie",
      "tv",
    ]);
  });
});

describe("filmography filtering", function () {
  const credits = [
    {
      id: 1,
      title: "Recent Film",
      media_type: "movie" as const,
      poster_path: null,
      release_date: "2024-03-01",
      genre_ids: [18],
      popularity: 20,
      vote_average: 7,
      vote_count: 100,
      roles: ["Actor"],
    },
    {
      id: 2,
      name: "Older Series",
      media_type: "tv" as const,
      poster_path: null,
      first_air_date: "2016-01-01",
      genre_ids: [35],
      popularity: 80,
      vote_average: 8,
      vote_count: 50,
      roles: ["Actor"],
    },
  ];

  it("derives available decades and genres from actual credits", function () {
    expect(buildFilmographyDecades(credits)).toEqual(["2020", "2010"]);
    expect(buildFilmographyGenres(credits)).toEqual([
      { id: 35, name: "Comedy" },
      { id: 18, name: "Drama" },
    ]);
  });

  it("filters format, decade, and genre before sorting", function () {
    expect(
      filterAndSortFilmographyCredits(credits, {
        media: "tv",
        decade: "2010",
        genre: "35",
        sort: "popularity",
      }).map((credit) => credit.id),
    ).toEqual([2]);

    expect(
      filterAndSortFilmographyCredits(credits, {
        media: "all",
        decade: "all",
        genre: "all",
        sort: "popularity",
      }).map((credit) => credit.id),
    ).toEqual([2, 1]);
  });

  it("normalizes invalid URL filters", function () {
    expect(
      parseFilmographyFilters({
        media: "cinema",
        decade: "2025",
        genre: "drama",
        sort: "length",
      }),
    ).toEqual({ media: "all", decade: "all", genre: "all", sort: "newest" });
  });

  it("drops valid filter syntax when options do not exist for the selected role", function () {
    expect(
      constrainFilmographyFilters(
        { media: "all", decade: "1990", genre: "99", sort: "newest" },
        ["2020", "2010"],
        [{ id: 18, name: "Drama" }],
      ),
    ).toEqual({ media: "all", decade: "all", genre: "all", sort: "newest" });
  });
});
