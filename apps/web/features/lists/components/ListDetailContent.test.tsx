import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FilmListDetail } from "@35mm/types";
import { ShellLayoutContext } from "@/components/layout/ShellLayoutContext";
import { ListDetailContent } from "./ListDetailContent";

const navigation = vi.hoisted(function () {
  return { back: vi.fn(), push: vi.fn() };
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
  entryCount: 0,
  isLiked: false,
  isOwner: false,
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
  owner: {
    id: "user-1",
    username: "pat",
    displayName: "Pat",
    avatarUrl: null,
  },
  posterUrls: [],
  entries: [
    {
      id: "entry-1",
      film: {
        id: "01J00000000000000000000000",
        title: "Perfect Days",
        year: 2023,
        posterUrl: null,
        genres: ["Drama"],
      },
      position: 10,
      note: null,
      addedAt: "2026-09-04T00:00:00.000Z",
    },
  ],
  clonedFromListId: null,
} satisfies FilmListDetail;

vi.mock("next/navigation", function () {
  return {
    useRouter: function () {
      return navigation;
    },
  };
});

vi.mock("@/features/auth/components/AuthPromptProvider", function () {
  return {
    useAuthPrompt: function () {
      return {
        isLoaded: true,
        isSignedIn: true,
        promptLogin: vi.fn(),
        requireAuth: function (action: () => void) {
          action();
        },
      };
    },
  };
});

vi.mock("../hooks/useLists", function () {
  return {
    useFilmList: function () {
      return {
        data: list,
        isLoading: false,
        isError: false,
        isFetchingNextPage: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
      };
    },
    useListMutations: function () {
      return {
        toggleLike: { mutate: vi.fn() },
        cloneList: { mutate: vi.fn() },
        updateList: { mutate: vi.fn(), isPending: false },
        addEntry: { mutate: vi.fn(), isPending: false },
        updateEntry: { mutate: vi.fn(), isPending: false },
        reorderEntries: { mutate: vi.fn() },
        removeEntry: { mutate: vi.fn() },
        deleteList: { mutate: vi.fn() },
      };
    },
  };
});

vi.mock("@/components/FilmPoster", function () {
  return {
    FilmPoster: function () {
      return <span />;
    },
  };
});

vi.mock("@/components/Avatar", function () {
  return {
    Avatar: function () {
      return <span role="img" aria-label="Pat profile photo" />;
    },
  };
});

vi.mock("@/components/UsernameLink/UsernameLink", function () {
  return {
    UsernameLink: function ({ displayName }: { displayName: string }) {
      return <span>{displayName}</span>;
    },
  };
});

vi.mock("./ListEntriesPanel", function () {
  return {
    ListEntriesPanel: function () {
      return <div>Film entries</div>;
    },
  };
});

vi.mock("./ListEditorModal", function () {
  return {
    ListEditorModal: function () {
      return null;
    },
  };
});

vi.mock("./ListEntryNoteModal", function () {
  return {
    ListEntryNoteModal: function () {
      return null;
    },
  };
});

vi.mock("@/components/ConfirmDialog/ConfirmDialog", function () {
  return {
    ConfirmDialog: function () {
      return null;
    },
  };
});

function renderList(previousPathname: string | null) {
  return render(
    <ShellLayoutContext.Provider
      value={{
        profileRailDisabled: false,
        setProfileRailDisabled: vi.fn(),
        previousPathname,
      }}
    >
      <ListDetailContent listId={list.id} />
    </ShellLayoutContext.Provider>,
  );
}

describe("ListDetailContent back navigation", function () {
  it("never displays fewer entries than the loaded film rows", function () {
    renderList(null);

    expect(screen.getByText("1 title")).toBeInTheDocument();
    expect(screen.getByText("1 film · 0 likes · Public")).toBeInTheDocument();
  });

  it("shows the list author's profile photo", function () {
    renderList(null);

    expect(
      screen.getByRole("img", { name: "Pat profile photo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Pat's profile" }),
    ).toHaveAttribute("href", "/pat");
    expect(screen.queryByText("by")).not.toBeInTheDocument();
  });

  it("hides Back on direct visits", function () {
    renderList(null);

    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
  });

  it("shows Back after in-app navigation and returns to history", async function () {
    navigation.back.mockReset();
    renderList("/lists");

    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(navigation.back).toHaveBeenCalledOnce();
  });
});
