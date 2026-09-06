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
  it("links canonical 35mm films by ULID", function () {
    render(<FilmCatalogCard film={baseFilm} showInfo={false} />);
    expect(screen.getByRole("link", { name: "Open Finding Nemo (2003)" }))
      .toHaveAttribute("href", "/title/movie/01ARZ3NDEKTSV4RRFFQ69G5FAV");
  });

  it("resolves TMDB-only films through click instead of leaking TMDB URL identity", function () {
    var onOpen = vi.fn();
    var tmdbFilm: FilmCatalogDisplayItem = { ...baseFilm, id: "tmdb:movie:12", source: "tmdb" };
    render(<FilmCatalogCard film={tmdbFilm} showInfo={false} onOpen={onOpen} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Finding Nemo (2003)" }));
    expect(onOpen).toHaveBeenCalledWith(tmdbFilm);
  });
});
