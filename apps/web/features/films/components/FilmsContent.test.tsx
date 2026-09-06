import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FilmsContent } from "./FilmsContent";

var replace = vi.fn();

vi.mock("next/navigation", function () {
  return {
    usePathname: function () { return "/films"; },
    useRouter: function () { return { replace }; },
    useSearchParams: function () { return new URLSearchParams(); },
  };
});

vi.mock("@clerk/nextjs", function () {
  return { useAuth: function () { return { getToken: vi.fn(async function () { return "token"; }) }; } };
});

vi.mock("../hooks/useFilmsCatalog", function () {
  return {
    useFilmsCatalog: function () {
      return {
        data: { pages: [{ items: [], nextCursor: null, hasMore: false }] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isError: false,
        isFetchingNextPage: false,
        isLoading: false,
        refetch: vi.fn(),
      };
    },
  };
});

vi.mock("../hooks/useTmdbFilmsCatalog", function () {
  return {
    useTmdbFilmsCatalog: function () {
      return {
        data: { pages: [{ items: [], nextPage: null, totalResults: 0 }] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isError: false,
        isFetchingNextPage: false,
        isLoading: false,
        refetch: vi.fn(),
      };
    },
  };
});

describe("FilmsContent view controls", function () {
  beforeEach(function () {
    replace.mockClear();
  });

  it("offers three views and stores non-default choice in URL", function () {
    render(<FilmsContent />);

    expect(screen.getByRole("button", { name: "Sort films" })).toHaveTextContent("Sort: Popular");
    expect(screen.getByRole("button", { name: "Film type" })).toHaveTextContent("Type: All titles");
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Grid with info" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "List" }));
    expect(replace).toHaveBeenCalledWith("/films?view=list", { scroll: false });
  });
});
