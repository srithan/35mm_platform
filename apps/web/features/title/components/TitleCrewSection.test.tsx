import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TitleCrewSection } from "./TitleCrewSection";

describe("TitleCrewSection", function () {
  it("shows key crew first and reveals exact roles grouped by department", async function () {
    render(
      <TitleCrewSection
        crew={[
          {
            id: 1,
            name: "Christopher Nolan",
            slug: "christopher-nolan",
            profile_path: null,
            department: "Directing",
            job: "Director",
          },
          {
            id: 2,
            name: "Lee Smith",
            slug: "lee-smith",
            profile_path: null,
            department: "Editing",
            job: "Editor",
          },
          {
            id: 3,
            name: "Alex One",
            slug: "alex-one",
            profile_path: null,
            department: "Lighting",
            job: "Gaffer",
          },
          {
            id: 4,
            name: "Alex Two",
            slug: "alex-two",
            profile_path: null,
            department: "Lighting",
            job: "Gaffer",
          },
          {
            id: 5,
            name: "Alex Three",
            slug: "alex-three",
            profile_path: null,
            department: "Lighting",
            job: "Gaffer",
          },
          {
            id: 6,
            name: "Alex Four",
            slug: "alex-four",
            profile_path: null,
            department: "Lighting",
            job: "Gaffer",
          },
          {
            id: 7,
            name: "Alex Five",
            slug: "alex-five",
            profile_path: null,
            department: "Lighting",
            job: "Gaffer",
          },
          {
            id: 8,
            name: "Morgan Coordinator",
            slug: "morgan-coordinator",
            profile_path: null,
            department: "Production",
            job: "Production Coordinator",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Crew" })).toBeInTheDocument();
    expect(screen.getByText("Key crew and craft credits")).toBeInTheDocument();
    expect(screen.getByText("Director")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Christopher Nolan" })).toHaveAttribute(
      "href",
      "/director/christopher-nolan",
    );
    expect(screen.getByText("Lighting")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alex One" })).toHaveAttribute(
      "href",
      "/lighting/alex-one",
    );
    expect(screen.getByRole("link", { name: "Alex Five" })).toBeInTheDocument();
    expect(document.querySelector(".border-dotted")).toBeTruthy();

    await userEvent.click(
      screen.getByRole("button", { name: "View all 8 credits" }),
    );

    expect(screen.getByText("8 credits across all departments")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Directing" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lighting" })).toBeInTheDocument();
    expect(screen.getByText("Gaffer")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show key crew" }),
    ).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(
      screen.getByRole("button", { name: "Show key crew" }),
    );

    expect(screen.getByText("Key crew and craft credits")).toBeInTheDocument();
    expect(screen.queryByText("Production Coordinator")).not.toBeInTheDocument();
  });

  it("shows exact credits immediately when no condensed roles are available", function () {
    render(
      <TitleCrewSection
        crew={[
          {
            id: 1,
            name: "Taylor Crew",
            slug: "taylor-crew",
            profile_path: null,
            department: "Production",
            job: "Production Coordinator",
          },
        ]}
      />,
    );

    expect(screen.getByText("Production Coordinator")).toBeInTheDocument();
    expect(screen.getByText("1 credit across all departments")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
