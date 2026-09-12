import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  buildFilmographyFilterDestination,
  FilmographyFilters,
} from "./FilmographyFilters";

vi.mock("next/navigation", function () {
  return {
    useRouter: () => ({ replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
  };
});

describe("FilmographyFilters", function () {
  it("renders direct text controls without native boxed selects", function () {
    const { container } = render(
      <FilmographyFilters
        personSlug="Gal Gadot"
        department="actor"
        departments={[
          { slug: "actor", label: "Acting", count: 55 },
          { slug: "producer", label: "Production", count: 21 },
        ]}
        filters={{ media: "all", decade: "all", genre: "all", sort: "newest" }}
        decades={["2020", "2010"]}
        genres={[{ id: 18, name: "Drama" }]}
      />,
    );

    expect(screen.getByRole("button", { name: "Role" })).toHaveTextContent("Actor");
    expect(screen.getByRole("button", { name: "Format" })).toHaveTextContent(
      "All titles",
    );
    expect(screen.getByRole("button", { name: "Decade" })).toHaveTextContent(
      "Any decade",
    );
    expect(screen.getByRole("button", { name: "Genre" })).toHaveTextContent(
      "Any genre",
    );
    expect(
      screen.getByRole("button", { name: "Sort filmography" }),
    ).toHaveTextContent("Sort: Newest first");
    expect(container.querySelector("select")).toBeNull();
  });

  it("keeps filters on role changes and canonicalizes query filters", function () {
    expect(
      buildFilmographyFilterDestination({
        currentQuery: "media=movie&department=acting&ref=discover",
        department: "actor",
        personSlug: "Gal Gadot",
        value: "producer",
      }),
    ).toBe("/producer/gal-gadot?media=movie&ref=discover");

    expect(
      buildFilmographyFilterDestination({
        currentQuery: "media=movie&ref=discover",
        department: "producer",
        filterKey: "media",
        personSlug: "Gal Gadot",
        value: "all",
      }),
    ).toBe("/producer/gal-gadot?ref=discover");
  });
});
