import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImgHTMLAttributes } from "react";
import { FilmSearch } from "./FilmSearch";

vi.mock("next/image", () => ({
  default: function Image(props: ImgHTMLAttributes<HTMLImageElement>) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("FilmSearch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("marks its portaled results panel as a composer popover", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        results: [
          {
            id: 550,
            title: "Fight Club",
            release_date: "1999-10-15",
            original_language: "en",
            genre_ids: [18],
            poster_path: null,
          },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<FilmSearch isHidden={false} onSelect={vi.fn()} />);

    await user.type(screen.getByRole("textbox", { name: "Search for a film" }), "fight");

    const option = await screen.findByRole("button", { name: /Fight Club/i });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/tmdb/search/movie?query=fight&include_adult=false&page=1",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
    expect(option.closest("[data-composer-popover]")).not.toBeNull();
  });
});
