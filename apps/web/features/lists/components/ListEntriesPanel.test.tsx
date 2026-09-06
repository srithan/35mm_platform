import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FilmListDetail } from "@35mm/types";
import { ListEntriesPanel } from "./ListEntriesPanel";

vi.mock("@/components/FilmPoster", function () {
  return {
    FilmPoster: function ({ alt }: { alt: string }) {
      return <span role="img" aria-label={alt} />;
    },
  };
});

vi.mock("@/features/feed/components/PostComposer/FilmSearch", function () {
  return { FilmSearch: function () { return null; } };
});

const list = {
  id: "list-1",
  type: "custom",
  isRanked: true,
  entries: [
    {
      id: "entry-1",
      film: {
        id: "01J00000000000000000000000",
        title: "Perfect Days",
        year: 2023,
        posterUrl: "/poster.jpg",
        genres: ["Drama"],
      },
      position: 10,
      note: "A quiet favorite.",
      addedAt: "2026-09-03T00:00:00.000Z",
    },
  ],
} as FilmListDetail;

describe("ListEntriesPanel", function () {
  it("renders film entries as an actionable poster grid", async function () {
    const onRemoveEntry = vi.fn();

    render(
      <ListEntriesPanel
        list={list}
        isOwner
        viewMode="grid"
        onRemoveEntry={onRemoveEntry}
      />
    );

    expect(screen.getByRole("img", { name: "Perfect Days" })).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("A quiet favorite.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove film" }));
    expect(onRemoveEntry).toHaveBeenCalledWith("entry-1");
  });
});
