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
  it("keeps plot copy in the program note and uses a responsive image frame", () => {
    const onOpenDetail = vi.fn();

    render(
      <HeroCard film={film} label="Popular pick" onOpenDetail={onOpenDetail} />,
    );

    expect(screen.getAllByText(plot)).toHaveLength(1);
    expect(screen.getByRole("complementary")).toHaveTextContent(plot);

    const card = screen.getByRole("article");
    const imagePanel = card.children[1];
    expect(card).not.toHaveClass("min-h-[420px]");
    expect(imagePanel).toHaveClass(
      "aspect-[4/3]",
      "sm:aspect-video",
      "lg:col-span-3",
    );

    const detailsLink = screen.getByRole("link", { name: "Details" });
    expect(detailsLink).toHaveAttribute("href", "/film/the-test-feature");
    fireEvent.click(detailsLink);
    expect(onOpenDetail).toHaveBeenCalledWith(film);
  });
});
