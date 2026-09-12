import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TMDBMultiSearchResult } from "@/lib/tmdb/types";
import { SearchResultsView } from "./SearchResultsView";

vi.mock("@/components/LazyImage", function () {
  return {
    LazyImage: function ({ src, alt }: { src: string | null; alt: string }) {
      return <img src={src ?? undefined} alt={alt} />;
    },
  };
});

const results: TMDBMultiSearchResult[] = [
  {
    id: 123,
    media_type: "person",
    name: "Paola Fernández",
    slug: "paola-fernandez",
    profile_path: "/paola.jpg",
    known_for_department: "Acting",
  },
  {
    id: 456,
    media_type: "movie",
    title: "Test Film",
    poster_path: "/film.jpg",
    backdrop_path: null,
    overview: "",
    release_date: "2026-01-01",
    vote_average: 8,
    vote_count: 100,
  },
];

describe("SearchResultsView", function () {
  it("renders person photos and links people to existing profile pages", function () {
    render(
      <SearchResultsView
        query="Paola"
        results={results}
        loading={false}
      />
    );

    expect(screen.getByRole("link", { name: /Paola Fernández/ })).toHaveAttribute(
      "href",
      "/actor/paola-fernandez"
    );
    expect(screen.getByRole("img", { name: "Paola Fernández" })).toHaveAttribute(
      "src",
      "https://image.tmdb.org/t/p/w342/paola.jpg"
    );
    expect(screen.getByText("Acting")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Test Film/ })).toHaveAttribute(
      "href",
      "/film/test-film"
    );
  });
});
