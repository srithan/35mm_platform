import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TMDBMedia } from "@/lib/tmdb/types";
import { TitlePageHero } from "./TitlePageHero";

vi.mock("next/navigation", function () {
  return {
    useRouter: function () {
      return { back: vi.fn(), push: vi.fn() };
    },
  };
});

const detail: TMDBMedia = {
  id: 27205,
  title: "Inception",
  poster_path: null,
  backdrop_path: null,
  overview: "",
  vote_average: 8.4,
  vote_count: 12,
};

describe("TitlePageHero", function () {
  it("links the header director name to the person page", function () {
    render(
      <TitlePageHero
        detail={detail}
        isTv={false}
        displayTitle="Inception"
        metaLine="2010"
        creditPeople={[
          {
            id: 525,
            name: "Christopher Nolan",
            slug: "christopher-nolan",
            profile_path: null,
            job: "Director",
          },
        ]}
      />,
    );

    expect(screen.getByText(/Directed by/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Christopher Nolan" })).toHaveAttribute(
      "href",
      "/director/christopher-nolan",
    );
  });
});
