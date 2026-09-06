import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TMDBMedia } from "@/lib/tmdb/types";
import { TitleAtAGlance } from "./TitleAtAGlance";

const detail: TMDBMedia = {
  id: 27205,
  title: "Inception",
  poster_path: null,
  backdrop_path: null,
  overview: "",
  vote_average: 8,
  vote_count: 10,
  credits: {
    cast: [],
    crew: [
      {
        id: 525,
        name: "Christopher Nolan",
        profile_path: null,
        job: "Director",
        department: "Directing",
      },
      {
        id: 559,
        name: "Emma Thomas",
        profile_path: null,
        job: "Producer",
        department: "Production",
      },
    ],
  },
  production_companies: [
    { id: 9996, logo_path: null, name: "Syncopy", origin_country: "GB" },
    { id: 174, logo_path: null, name: "Warner Bros. Pictures", origin_country: "US" },
  ],
};

describe("TitleAtAGlance", function () {
  it("links director, producer, and studio names", function () {
    render(
      <TitleAtAGlance
        isTv={false}
        yearStr="2010"
        certification="PG-13"
        detail={detail}
      />,
    );

    expect(screen.getByRole("link", { name: "Christopher Nolan" })).toHaveAttribute(
      "href",
      "/person/525",
    );
    expect(screen.getByRole("link", { name: "Emma Thomas" })).toHaveAttribute(
      "href",
      "/person/559",
    );
    expect(screen.getByRole("link", { name: "Syncopy" })).toHaveAttribute(
      "href",
      "/company/9996",
    );
    expect(
      screen.getByRole("link", { name: "Warner Bros. Pictures" }),
    ).toHaveAttribute("href", "/company/174");
  });
});
