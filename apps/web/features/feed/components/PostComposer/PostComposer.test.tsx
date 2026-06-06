import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostComposer } from "./index";

const mocks = vi.hoisted(() => ({
  createPostMutateAsync: vi.fn(async () => ({})),
  updatePostMutateAsync: vi.fn(async () => ({})),
  resolveOnboardingFilmsMock: vi.fn(async () => ["01ARZ3NDEKTSV4RRFFQ69G5FAV"]),
  fetchLinkPreviewMock: vi.fn(async (url: string) => ({
    url,
    title: "Preview title",
    description: "Preview description",
    image: null,
    domain: "youtube.com",
    provider: "youtube" as const,
  })),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn(async () => "test-token") }),
  useUser: () => ({ user: { fullName: "Test User", username: "testuser", imageUrl: null } }),
}));

vi.mock("@/components/Avatar", () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

vi.mock("@/features/profile/hooks/useCurrentUserProfile", () => ({
  initialForName: () => "T",
  useCurrentUserProfile: () => ({
    data: { displayName: "Test User", avatarUrl: null },
  }),
}));

vi.mock("../../hooks/usePostMutations", () => ({
  useCreatePost: () => ({ mutateAsync: mocks.createPostMutateAsync }),
  useUpdatePost: () => ({ mutateAsync: mocks.updatePostMutateAsync }),
}));

vi.mock("../../api/postsApi", () => ({
  fetchLinkPreview: mocks.fetchLinkPreviewMock,
}));

vi.mock("@/features/onboarding/api/onboardingApi", () => ({
  resolveOnboardingFilmsFromTmdb: mocks.resolveOnboardingFilmsMock,
}));

vi.mock("@/features/profile/api/mediaApi", () => ({
  presignProfileMediaUpload: vi.fn(),
  uploadToPresignedUrl: vi.fn(),
}));

vi.mock("./FilmSearch", () => ({
  FilmSearch: ({ onSelect, isHidden }: { onSelect: (film: { id: number; title: string; year: string; language: string; genres: string[]; posterPath: string | null }) => void; isHidden: boolean }) =>
    isHidden ? null : (
      <button
        type="button"
        onClick={() =>
          onSelect({
            id: 550,
            title: "Fight Club",
            year: "1999",
            language: "English",
            genres: ["Drama"],
            posterPath: "/poster.jpg",
          })
        }
      >
        Pick film
      </button>
    ),
}));

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    disconnect() {}
    unobserve() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

beforeEach(() => {
  mocks.createPostMutateAsync.mockClear();
  mocks.updatePostMutateAsync.mockClear();
  mocks.resolveOnboardingFilmsMock.mockClear();
  mocks.fetchLinkPreviewMock.mockClear();
});

describe("PostComposer", () => {
  it("keeps pasted YouTube URL in text and submits it", async () => {
    const user = userEvent.setup();
    render(<PostComposer variant="inline" />);
    const textarea = screen.getByPlaceholderText("What's on your mind about cinema?");
    const youtubeUrl = "https://www.youtube.com/watch?v=qU4bAFjBXUI";

    await user.click(textarea);
    await user.type(textarea, "lit ");
    await user.paste(youtubeUrl);

    expect(textarea).toHaveValue(`lit ${youtubeUrl}`);

    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(mocks.createPostMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mocks.createPostMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        body: `lit ${youtubeUrl}`,
      })
    );
  });

  it("accepts pasted clipboard image files", async () => {
    render(<PostComposer variant="inline" />);
    const textarea = screen.getByPlaceholderText("What's on your mind about cinema?");
    const file = new File(["image-bytes"], "pasted-image.png", { type: "image/png" });

    fireEvent.paste(textarea, {
      clipboardData: {
        items: [
          {
            kind: "file",
            type: "image/png",
            getAsFile: () => file,
          },
        ],
        files: [file],
        getData: () => "",
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Attached images")).toBeInTheDocument();
    });
  });

  it("submits log with postToFeed false when unchecked", async () => {
    const user = userEvent.setup();
    render(<PostComposer variant="inline" initialMode="log" />);

    await user.click(screen.getByRole("button", { name: "Pick film" }));
    await user.click(screen.getByRole("checkbox", { name: /post to feed/i }));
    await user.click(screen.getByRole("button", { name: "Log" }));

    await waitFor(() => {
      expect(mocks.createPostMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mocks.createPostMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "log",
        body: "Logged Fight Club",
        postToFeed: false,
        visibility: "private",
      })
    );
  });

});
