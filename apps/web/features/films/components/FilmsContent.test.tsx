import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  return { useAuth: function () { return { getToken: vi.fn(async function () { return "token"; }), isSignedIn: false }; } };
});

vi.mock("@/features/auth/components/AuthPromptProvider", function () {
  return {
    useAuthPrompt: function () {
      return { requireAuth: function (action: () => void) { action(); } };
    },
  };
});

vi.mock("@/features/profile/hooks/useCurrentUserProfile", function () {
  return {
    useCurrentUserProfile: function () {
      return { data: null, isLoading: false };
    },
  };
});

vi.mock("@/features/lists/hooks/useLists", function () {
  return {
    useListMutations: function () {
      return { addEntry: { mutate: vi.fn(), isPending: false } };
    },
    useProfileLists: function () {
      return {
        data: { pages: [{ items: [] }] },
        isLoading: false,
      };
    },
  };
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
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(function () {
        return {
          addEventListener: vi.fn(),
          matches: true,
          removeEventListener: vi.fn(),
        };
      }),
    });
  });

  it("offers three views and stores non-default choice in URL", async function () {
    render(<FilmsContent />);

    await waitFor(function () {
      expect(screen.getByRole("region", { name: "Film filters" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Sort films" })).toHaveTextContent("Popular");
    expect(screen.getByRole("button", { name: "Film type" })).toHaveTextContent("Type");
    expect(screen.getByRole("button", { name: "Search films" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More film filters" })).toHaveTextContent("Filters");
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Grid with info" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "List" }));
    expect(replace).toHaveBeenCalledWith("/films?view=list", { scroll: false });
  });
});
