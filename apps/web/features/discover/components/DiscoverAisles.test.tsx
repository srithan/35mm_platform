import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { MoodGridAisles, StreamingNowAisle } from "./DiscoverAisles";

vi.mock("@/components/LazyImage", () => ({
  LazyImage: ({ alt }: { alt: string }) => <span aria-label={alt} role="img" />,
}));

const films: TMDBMovie[] = [
  {
    id: 101,
    media_type: "movie",
    title: "The Test Feature",
    poster_path: "/feature.jpg",
    backdrop_path: null,
    overview: "",
    release_date: "2024-05-01",
    vote_average: 8,
    vote_count: 100,
  },
  {
    id: 202,
    media_type: "tv",
    name: "The Test Series",
    poster_path: "/series.jpg",
    backdrop_path: null,
    overview: "",
    first_air_date: "2025-02-14",
    vote_average: 7.5,
    vote_count: 80,
  },
];

describe("StreamingNowAisle", () => {
  it("shows editorial streaming titles without filter controls", () => {
    const onFilmClick = vi.fn();

    render(
      <StreamingNowAisle
        films={films}
        loading={false}
        onFilmClick={onFilmClick}
      />,
    );

    expect(screen.queryByRole("group", { name: "Filter by streaming service" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit your services" })).not.toBeInTheDocument();

    const titleRail = screen.getByRole("list", {
      name: "Streaming titles across your services",
    });
    expect(titleRail).toHaveClass("flex", "sm:grid");
    expect(screen.queryByText("Streaming")).not.toBeInTheDocument();
    expect(screen.queryByText("The Test Feature")).not.toBeInTheDocument();
    expect(screen.queryByText("2024")).not.toBeInTheDocument();
    expect(screen.queryByText("2025 · Series")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open The Test Feature" }).closest("li")).toHaveClass(
      "w-[122px]",
      "sm:w-auto",
    );

    fireEvent.click(screen.getByRole("button", { name: "Open The Test Feature" }));
    expect(onFilmClick).toHaveBeenCalledWith(films[0]);
  });

  it("shows a quiet empty state for the saved service lineup", () => {
    render(
      <StreamingNowAisle
        films={[]}
        loading={false}
        onFilmClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "No streaming titles found for your saved services.",
    );
  });
});

describe("MoodGridAisles", () => {
  it("presents each genre group as a separate labelled panel", () => {
    const onFilmClick = vi.fn();

    render(
      <MoodGridAisles
        groups={[
          { title: "Sci-fi, drama & mystery", films: [films[0]] },
          { title: "Adventure, fantasy & history", films: [films[1]] },
        ]}
        onFilmClick={onFilmClick}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Genre collections" }),
    ).toBeInTheDocument();

    const sciFiPanel = screen.getByRole("region", {
      name: "Sci-fi, drama & mystery",
    });
    const adventurePanel = screen.getByRole("region", {
      name: "Adventure, fantasy & history",
    });

    expect(sciFiPanel).toHaveClass(
      "border-border-strong",
      "bg-sunken",
      "p-4",
    );
    expect(adventurePanel).toHaveClass(
      "border-border-strong",
      "bg-sunken",
      "p-4",
    );
    expect(screen.getAllByText("Genre program")).toHaveLength(2);
    expect(screen.getAllByText("1 film")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "The Test Feature" }));
    expect(onFilmClick).toHaveBeenCalledWith(films[0]);
  });
});
