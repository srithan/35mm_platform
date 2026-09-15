import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { HeroCard } from "./HeroCard";

vi.mock("@/components/LazyImage", () => ({
  LazyImage: ({ alt }: { alt: string }) => <span aria-label={alt} role="img" />,
}));

const plot = "One program note should describe this featured film.";
const film: TMDBMovie = {
  id: 101,
  media_type: "movie",
  title: "The Test Feature",
  poster_path: "/feature.jpg",
  backdrop_path: "/feature-backdrop.jpg",
  overview: plot,
  release_date: "2024-05-01",
  vote_average: 8,
  vote_count: 100,
};

describe("HeroCard", () => {
  it("keeps plot copy below a title-page style cover frame", () => {
    const onOpenDetail = vi.fn();

    render(
      <HeroCard film={film} label="Popular pick" onOpenDetail={onOpenDetail} />,
    );

    expect(screen.getAllByText(plot)).toHaveLength(1);
    expect(screen.getByRole("img", { name: "The Test Feature poster" })).toBeInTheDocument();

    const card = screen.getByRole("article");
    const imagePanel = screen.getByRole("link", { name: "Open The Test Feature cover" });
    expect(card).not.toHaveClass("min-h-[420px]");
    expect(imagePanel).toHaveClass(
      "h-[190px]",
      "sm:h-[280px]",
      "lg:h-[320px]",
    );
    expect(screen.getByRole("heading", { name: "The Test Feature" })).toHaveClass(
      "text-[clamp(1.65rem,3.1vw,3.25rem)]",
    );

    const detailsLink = screen.getByRole("link", { name: "Details" });
    expect(detailsLink).toHaveAttribute("href", "/film/the-test-feature");
    fireEvent.click(detailsLink);
    expect(onOpenDetail).toHaveBeenCalledWith(film);
  });
});
