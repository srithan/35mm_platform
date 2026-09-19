import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FilmListSummary } from "@35mm/types";
import { PublicListCard, PublicListsPageContent } from "./PublicListsPageContent";

const pageMocks = vi.hoisted(() => ({
  push: vi.fn(),
  usePublicLists: vi.fn(() => ({
    data: { pages: [{ items: [] as FilmListSummary[] }] },
    hasNextPage: false,
  })),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pageMocks.push }) }));
vi.mock("@/lib/config/uiFlags", () => ({
  BROWSE_CHROME_VARIANT: "rail",
  BROWSE_DENSITY_VARIANT: "compact",
  BROWSE_DIRECTORY_TABS_ENABLED: false,
}));
vi.mock("@/features/auth/components/AuthPromptProvider", () => ({
  useAuthPrompt: () => ({
    isLoaded: true,
    isSignedIn: true,
    promptLogin: vi.fn(),
    requireAuth: (action: () => void) => action(),
  }),
}));
vi.mock("../hooks/useLists", () => ({
  usePublicLists: pageMocks.usePublicLists,
  useListMutations: () => ({ createList: { mutate: vi.fn(), isPending: false, error: null } }),
}));
vi.mock("./ListEditorModal", () => ({ ListEditorModal: ({ open }: { open: boolean }) => open ? <div role="dialog">Create collection</div> : null }));

vi.mock("@/components/FilmPoster", function () {
  return {
    FilmPoster: function () {
      return <span data-testid="poster" />;
    },
  };
});

const list = {
  id: "list-1",
  userId: "user-1",
  type: "custom",
  title: "City Symphonies",
  description: null,
  visibility: "public",
  isRanked: false,
  tags: [],
  shareSlug: "city-symphonies",
  likeCount: 0,
  commentCount: 0,
  entryCount: 4,
  isLiked: false,
  isOwner: false,
  posterUrls: [],
  owner: {
    id: "user-1",
    username: "pat",
    displayName: "Pat",
    avatarUrl: null,
  },
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
} as FilmListSummary;

describe("PublicListCard", function () {
  it("hides zero beside the like button", function () {
    render(<PublicListCard list={list} onToggleLike={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Like list" })).not.toHaveTextContent("0");
  });

  it("shows a non-zero like count", function () {
    render(
      <PublicListCard
        list={{ ...list, likeCount: 3 }}
        onToggleLike={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Like list" })).toHaveTextContent("3");
  });
});

describe("PublicListsPageContent", () => {
  it("keeps creation available with no results and opens the editor", () => {
    render(<PublicListsPageContent />);
    fireEvent.click(screen.getByRole("button", { name: /Create List/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter list type" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter list size" })).toBeInTheDocument();
  });

  it("debounces title search and clears all filters", async () => {
    render(<PublicListsPageContent />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search lists" }), { target: { value: "city" } });
    await waitFor(() => expect(pageMocks.usePublicLists).toHaveBeenLastCalledWith("popular", { q: "city", format: "all", size: "all" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(pageMocks.usePublicLists).toHaveBeenLastCalledWith("popular", { q: "", format: "all", size: "all" });
  });

  it("renders refreshed public lists as a one-column list view", () => {
    pageMocks.usePublicLists.mockReturnValueOnce({
      data: { pages: [{ items: [{ ...list, likeCount: 2 }] }] },
      hasNextPage: false,
    });

    render(<PublicListsPageContent />);

    expect(screen.getByRole("list", { name: "Public lists" })).toHaveClass("flex", "flex-col");
    expect(screen.getByRole("list")).not.toHaveClass("md:grid-cols-2");
    expect(screen.getByRole("listitem")).toHaveTextContent("City Symphonies");
    expect(screen.getByRole("listitem")).toHaveClass("border-b", "px-1", "py-3");
    expect(screen.getByRole("listitem")).toHaveClass("sm:grid-cols-[160px_minmax(0,1fr)_minmax(3rem,auto)]");
    expect(screen.getByRole("listitem")).not.toHaveClass("rounded-3xl", "p-5");
    expect(screen.getByRole("button", { name: "Create List" })).toBeInTheDocument();
  });
});
