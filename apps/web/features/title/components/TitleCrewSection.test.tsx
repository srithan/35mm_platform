import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitleCrewSection } from "./TitleCrewSection";

describe("TitleCrewSection", function () {
  it("renders crew in two columns with a dotted leader between role and names", function () {
    render(
      <TitleCrewSection
        crew={[
          {
            id: 1,
            name: "Christopher Nolan",
            profile_path: null,
            department: "Directing",
            job: "Director",
          },
          {
            id: 2,
            name: "Lee Smith",
            profile_path: null,
            department: "Editing",
            job: "Editor",
          },
          {
            id: 3,
            name: "Alex One",
            profile_path: null,
            department: "Lighting",
            job: "Gaffer",
          },
          {
            id: 4,
            name: "Alex Two",
            profile_path: null,
            department: "Lighting",
            job: "Gaffer",
          },
          {
            id: 5,
            name: "Alex Three",
            profile_path: null,
            department: "Lighting",
            job: "Gaffer",
          },
          {
            id: 6,
            name: "Alex Four",
            profile_path: null,
            department: "Lighting",
            job: "Gaffer",
          },
          {
            id: 7,
            name: "Alex Five",
            profile_path: null,
            department: "Lighting",
            job: "Gaffer",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Crew" })).toBeInTheDocument();
    expect(screen.getByText("Director")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Christopher Nolan" })).toHaveAttribute(
      "href",
      "/person/1",
    );
    expect(screen.getByText("Gaffer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alex One" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alex Five" })).toBeInTheDocument();
    expect(document.querySelector(".border-dotted")).toBeTruthy();
  });
});
