import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  TITLE_CAST_GRID_CAPACITY,
  TitleCastSection,
} from "./TitleCastSection";

function buildCast(count: number) {
  const cast = [];
  for (var i = 0; i < count; i++) {
    cast.push({
      id: i + 1,
      name: "Actor " + (i + 1),
      profile_path: null,
      character: "Role " + (i + 1),
    });
  }
  return cast;
}

describe("TitleCastSection", function () {
  it("shows a preview with See all in the last grid slot and expands to full cast", async () => {
    render(
      <TitleCastSection cast={buildCast(TITLE_CAST_GRID_CAPACITY + 3)} />,
    );

    expect(screen.getByText("Actor 1")).toBeInTheDocument();
    expect(screen.getByText("Actor " + (TITLE_CAST_GRID_CAPACITY - 1))).toBeInTheDocument();
    expect(
      screen.queryByText("Actor " + TITLE_CAST_GRID_CAPACITY),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "See all 4 cast members" }),
    ).toBeInTheDocument();
    expect(screen.getByText("+4")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "See all 4 cast members" }),
    );

    expect(
      screen.getByText("Actor " + (TITLE_CAST_GRID_CAPACITY + 3)),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /See all/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the full cast grid when the preview limit is not exceeded", function () {
    render(<TitleCastSection cast={buildCast(6)} />);

    expect(screen.getByText("Actor 6")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /See all/i })).not.toBeInTheDocument();
  });

  it("shows every cast member without See all when the grid is exactly full", function () {
    render(<TitleCastSection cast={buildCast(TITLE_CAST_GRID_CAPACITY)} />);

    expect(screen.getByText("Actor " + TITLE_CAST_GRID_CAPACITY)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /See all/i })).not.toBeInTheDocument();
  });
});
