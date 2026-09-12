import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { FilmShelf } from "./FilmShelf";

const watchlistMutate = vi.fn();

vi.mock("@/components/LazyImage", function () {
  return {
    LazyImage: function ({ alt }: { alt: string }) {
      return <span role="img" aria-label={alt} />;
    },
  };
});

vi.mock("@/features/lists/hooks/useLists", function () {
  return {
    useWatchlistMutation: function () {
      return {
        isPending: false,
        mutate: watchlistMutate,
        variables: undefined,
      };
    },
  };
});

const film: TMDBMovie = {
  id: 101,
  media_type: "movie",
  title: "Hidden Metadata Film",
  poster_path: "/poster.jpg",
  backdrop_path: null,
  overview: "",
  release_date: "2026-01-01",
  vote_average: 8,
  vote_count: 100,
};

describe("FilmShelf", function () {
  it("hides visible card title and year while preserving poster accessibility", function () {
    const onFilmClick = vi.fn();

    render(
      <FilmShelf
        title="Test shelf"
        films={[film]}
        onFilmClick={onFilmClick}
      />
    );

    expect(screen.queryByText("Hidden Metadata Film")).not.toBeInTheDocument();
    expect(screen.queryByText("2026")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Hidden Metadata Film" })).toBeInTheDocument();

    const titleLink = screen.getByRole("link", { name: "Open Hidden Metadata Film" });
    expect(titleLink).toHaveAttribute("href", "/film/hidden-metadata-film");
    fireEvent.click(titleLink);
    expect(onFilmClick).toHaveBeenCalledWith(film);
  });
});
