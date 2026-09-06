import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProfileStatsSummary } from "../api/profileApi";
import { ProfileStatsDashboard } from "./ProfileStatsDashboard";

const stats: ProfileStatsSummary = {
  username: "cinephile",
  selectedYear: null,
  availableYears: [2026, 2025, 2024],
  filmsLoggedCount: 128,
  hoursWatched: 256,
  runtimeKnownCount: 128,
  averageRating: 3.8,
  ratedCount: 120,
  uniqueFilmsCount: 116,
  rewatchCount: 12,
  thisYearCount: 31,
  reviewsWrittenCount: 42,
  reviewLikeCount: 84,
  memberSince: "2022-03-01T00:00:00.000Z",
  favoriteFilms: [],
  genres: [{ name: "Drama", count: 48, percentage: 38 }],
  activity: [{ date: new Date().toISOString().slice(0, 10), count: 2 }],
  ratingDistribution: [{ rating: 4, count: 32 }],
  decades: [{ decade: 1990, count: 24 }],
  directors: [{ name: "Agnès Varda", count: 7 }],
  artists: [{ name: "Sandrine Bonnaire", count: 5 }],
  musicDirectors: [{ name: "Michel Legrand", count: 4 }],
  countries: [{ name: "France", count: 18 }],
  languages: [{ name: "French", count: 15 }],
  mostWatchedFilms: [],
  cachedAt: "2026-09-03T00:00:00.000Z",
};

describe("ProfileStatsDashboard", function () {
  it("renders deep film statistics without duplicating diary content", function () {
    var onYearChange = vi.fn();
    render(
      <ProfileStatsDashboard
        stats={stats}
        displayName="Maya"
        selectedYear={null}
        onYearChange={onYearChange}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Maya's life in film" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ratings skyline")).toBeInTheDocument();
    expect(screen.getByText("Decades explored")).toBeInTheDocument();
    expect(screen.getByText("Genres in rotation")).toBeInTheDocument();
    expect(screen.getByText("Agnès Varda")).toBeInTheDocument();
    expect(screen.getByText("Sandrine Bonnaire")).toBeInTheDocument();
    expect(screen.getByText("Michel Legrand")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Stats year" })).toHaveValue(
      "all",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Stats year" }), {
      target: { value: "2025" },
    });
    expect(onYearChange).toHaveBeenCalledWith(2025);
    expect(screen.queryByText(/recent diary/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view full diary/i)).not.toBeInTheDocument();
  });
});
