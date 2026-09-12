import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TMDBMovie, TMDBVideo } from "@/lib/tmdb/types";
import { TitleActionButtons } from "./TitleActionButtons";
import { TitleOverviewContent } from "./TitleOverviewContent";
import { TitleReviewStars } from "./TitleReviewStars";

vi.mock("@/features/lists/hooks/useLists", function () {
  return {
    useWatchlistMutation: function () {
      return { isPending: false, mutate: vi.fn() };
    },
  };
});

vi.mock("@/features/auth/components/AuthPromptProvider", function () {
  return {
    useAuthPrompt: function () {
      return {
        isLoaded: true,
        isSignedIn: true,
        promptLogin: vi.fn(),
        requireAuth: function (action: () => void) {
          action();
        },
      };
    },
  };
});

const detail: TMDBMovie = {
  id: 101,
  media_type: "movie",
  title: "Test Film",
  poster_path: null,
  backdrop_path: null,
  overview: "",
  release_date: "2026-01-01",
  vote_average: 8,
  vote_count: 100,
};

const trailer: TMDBVideo = {
  id: "trailer-1",
  key: "youtube-key",
  name: "Official trailer",
  official: true,
  site: "YouTube",
  type: "Trailer",
};

const recommendation: TMDBMovie = {
  ...detail,
  id: 202,
  title: "Recommended Hidden Film",
  poster_path: "/recommendation.jpg",
  release_date: "2025-01-01",
};

describe("title page theme styles", function () {
  it("uses theme background as accent-button foreground", function () {
    render(
      <TitleActionButtons
        detail={detail}
        media="movie"
        tmdbId="101"
        imdbId={null}
        onWriteReview={vi.fn()}
      />
    );

    const writeReview = screen.getByRole("button", { name: "Write review" });
    expect(writeReview).toHaveClass("bg-accent", "text-bg");
    expect(writeReview).not.toHaveClass("text-white");
  });

  it("marks selected trailer without Tailwind's fallback blue ring", function () {
    render(
      <TitleOverviewContent
        section="about"
        detail={detail}
        isTv={false}
        yearStr="2026"
        certification={undefined}
        seasons={[]}
        displayVideos={[trailer]}
        playingKey={trailer.key}
        onSelectVideoKey={vi.fn()}
        recommendations={[]}
      />
    );

    const selectedTrailer = screen.getByRole("button", { name: "Official trailer" });
    expect(selectedTrailer).toHaveClass("border-film-gold");
    expect(selectedTrailer).not.toHaveClass("ring-2", "ring-film-gold/50");
  });

  it("hides More like this card metadata while retaining poster labels", function () {
    render(
      <TitleOverviewContent
        section="more"
        detail={detail}
        isTv={false}
        yearStr="2026"
        certification={undefined}
        seasons={[]}
        displayVideos={[]}
        playingKey={null}
        onSelectVideoKey={vi.fn()}
        recommendations={[recommendation]}
      />
    );

    expect(screen.queryByText("Recommended Hidden Film")).not.toBeInTheDocument();
    expect(screen.queryByText("2025")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Recommended Hidden Film" })
    ).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveClass("grid-cols-3");
    expect(screen.getByRole("list")).not.toHaveClass("grid-cols-2");
  });

  it("renders more than eight related titles when the shelf is full", function () {
    const recommendations = Array.from({ length: 16 }, function (_item, index) {
      return {
        ...recommendation,
        id: 300 + index,
        title: "Related Film " + (index + 1),
      };
    });

    render(
      <TitleOverviewContent
        section="more"
        detail={detail}
        isTv={false}
        yearStr="2026"
        certification={undefined}
        seasons={[]}
        displayVideos={[]}
        playingKey={null}
        onSelectVideoKey={vi.fn()}
        recommendations={recommendations}
      />
    );

    expect(
      screen.getAllByRole("link", { name: /Open Related Film / })
    ).toHaveLength(16);
  });

  it("provides an accessible score for compact title-page review stars", function () {
    render(<TitleReviewStars rating={4.5} />);

    expect(screen.getByRole("img", { name: "4.5 out of 5 stars" })).toBeInTheDocument();
    expect(screen.getByText("/ 5")).toBeInTheDocument();
  });
});
