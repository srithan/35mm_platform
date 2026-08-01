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
  it("uses touch-friendly horizontal rails on mobile and keeps provider state accessible", () => {
    const onProviderChange = vi.fn();
    const onFilmClick = vi.fn();

    render(
      <StreamingNowAisle
        films={films}
        loading={false}
        activeProviderId={8}
        onProviderChange={onProviderChange}
        onFilmClick={onFilmClick}
      />,
    );

    const providerGroup = screen.getByRole("group", {
      name: "Streaming services",
    });
    expect(providerGroup).toHaveClass("w-max", "sm:flex-wrap");
    expect(screen.getByRole("button", { name: "Netflix" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const titleRail = screen.getByRole("list", { name: "Streaming titles" });
    expect(titleRail).toHaveClass("flex", "sm:grid");
    expect(screen.getByText("The Test Feature").closest("li")).toHaveClass(
      "w-[122px]",
      "sm:w-auto",
    );
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("2025 · Series")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "MUBI" }));
    expect(onProviderChange).toHaveBeenCalledWith(11);

    fireEvent.click(screen.getByText("The Test Feature"));
    expect(onFilmClick).toHaveBeenCalledWith(films[0]);
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
