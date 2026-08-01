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

    const card = screen.getByRole("button", { name: /The Test Feature/ });
    const imagePanel = card.firstElementChild;
    expect(card).not.toHaveClass("min-h-[420px]");
    expect(imagePanel).toHaveClass(
      "aspect-[4/3]",
      "sm:aspect-video",
      "lg:col-span-3",
    );

    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(onOpenDetail).toHaveBeenCalledWith(film);
  });
});
