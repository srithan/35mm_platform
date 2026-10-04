import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudioContent } from "./StudioContent";

const state = vi.hoisted(function () {
  return {
    userId: "creator-1" as string | null,
    getUploadedFilms: vi.fn(),
  };
});

vi.mock("@clerk/nextjs", function () {
  return {
    useAuth: function () {
      return {
        userId: state.userId,
        isLoaded: true,
        getToken: vi.fn(async function () {
          return "token";
        }),
      };
    },
  };
});

vi.mock("@/features/videos/api/videoApi", function () {
  return { getUploadedFilms: state.getUploadedFilms };
});

vi.mock("@/lib/config/uiFlags", function () {
  return {
    BROWSE_CHROME_VARIANT: "focused",
    BROWSE_DENSITY_VARIANT: "compact",
  };
});

function renderStudio() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <StudioContent />
    </QueryClientProvider>,
  );
}

describe("StudioContent", function () {
  beforeEach(function () {
    state.userId = "creator-1";
    state.getUploadedFilms.mockReset();
    state.getUploadedFilms.mockResolvedValue({
      items: [
        {
          id: "01PROJECTONE00000000000000",
          assetId: "asset-1",
          title: "North Exit",
          description: "",
          tagline: "",
          director: "Mira Chen",
          year: 2025,
          language: "en",
          country: "US",
          genres: ["Drama"],
          contentRating: "",
          tags: [],
          festivalNotes: "",
          thumbnailUrl: null,
          durationSeconds: 720,
          visibility: "public",
          releaseAt: "2025-01-01T00:00:00.000Z",
          author: {
            id: "creator-1",
            username: "mira",
            displayName: "Mira Chen",
          },
          isOwner: true,
        },
        {
          id: "01PROJECTTWO00000000000000",
          assetId: "asset-2",
          title: "Bright Rooms",
          description: "",
          tagline: "",
          director: "Oko Films",
          year: 2030,
          language: "en",
          country: "US",
          genres: ["Drama"],
          contentRating: "",
          tags: [],
          festivalNotes: "",
          thumbnailUrl: null,
          durationSeconds: 4680,
          visibility: "private",
          releaseAt: "2030-01-01T00:00:00.000Z",
          author: {
            id: "creator-1",
            username: "oko",
            displayName: "Oko Films",
          },
          isOwner: true,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
  });

  it("renders real creator projects and keeps Studio active", async function () {
    renderStudio();

    expect(
      await screen.findByRole("heading", { name: "Manage releases." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Studio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      await screen.findByRole("heading", { name: "North Exit" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Bright Rooms" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("private")).toBeInTheDocument();
    expect(state.getUploadedFilms).toHaveBeenCalledWith(null, true, "token");
  });

  it("directs creators without published projects to upload", async function () {
    state.getUploadedFilms.mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    });
    renderStudio();

    expect(
      await screen.findByRole("heading", { name: "Start your first release." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload a film" })).toHaveAttribute(
      "href",
      "/70mm/upload",
    );
  });

  it("does not request private projects while signed out", async function () {
    state.userId = null;
    renderStudio();

    expect(
      screen.getByRole("heading", { name: "Your projects live here." }),
    ).toBeInTheDocument();
    await waitFor(function () {
      expect(state.getUploadedFilms).not.toHaveBeenCalled();
    });
  });
});
