import { describe, expect, it } from "vitest";
import {
  buildDiscoverExploreUrl,
  DEFAULT_DISCOVER_EXPLORE_FILTERS,
  DISCOVER_DECADE_OPTIONS,
} from "./discoverExploreFilters";

describe("discover decade filters", function () {
  it("offers individual decades through the 1870s", function () {
    expect(DISCOVER_DECADE_OPTIONS.at(-1)).toEqual({
      id: "1870s",
      label: "1870s",
    });
    expect(DISCOVER_DECADE_OPTIONS).toHaveLength(17);
  });

  it("builds an exact release range for the selected decade", function () {
    const url = buildDiscoverExploreUrl({
      sortBy: "popularity.desc",
      genreId: null,
      moodId: "all",
      filters: {
        ...DEFAULT_DISCOVER_EXPLORE_FILTERS,
        decadeId: "1870s",
      },
    });
    const params = new URL(url, "https://35mm.test").searchParams;

    expect(params.get("primary_release_date.gte")).toBe("1870-01-01");
    expect(params.get("primary_release_date.lte")).toBe("1879-12-31");
  });
});
