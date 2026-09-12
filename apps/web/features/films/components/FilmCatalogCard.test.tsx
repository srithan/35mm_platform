import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FilmCatalogDisplayItem } from "../api/filmsApi";
import { FilmCatalogCard } from "./FilmCatalogCard";

var baseFilm: FilmCatalogDisplayItem = {
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  tmdbId: 12,
  mediaType: "movie",
  title: "Finding Nemo",
  originalTitle: null,
  year: 2003,
  runtime: 100,
  posterUrl: null,
  genres: ["Animation"],
  director: null,
  language: "en",
  country: null,
  isVerified: false,
  source: "35mm",
};

describe("FilmCatalogCard identity", function () {
  it("links canonical 35mm films by title slug", function () {
    render(<FilmCatalogCard film={baseFilm} showInfo={false} />);
    expect(screen.getByRole("link", { name: "Open Finding Nemo (2003)" }))
      .toHaveAttribute("href", "/film/finding-nemo");
  });

  it("exposes the slug destination while resolving TMDB-only films on ordinary click", function () {
    var onOpen = vi.fn();
    var tmdbFilm: FilmCatalogDisplayItem = { ...baseFilm, id: "tmdb:movie:12", source: "tmdb" };
    render(<FilmCatalogCard film={tmdbFilm} showInfo={false} onOpen={onOpen} />);

    const link = screen.getByRole("link", { name: "Open Finding Nemo (2003)" });
    expect(link).toHaveAttribute("href", "/film/finding-nemo");
    fireEvent.click(link);
    expect(onOpen).toHaveBeenCalledWith(tmdbFilm);
  });
});
