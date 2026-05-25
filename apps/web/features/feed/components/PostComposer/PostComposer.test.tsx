import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostComposer } from "./index";

const createPostMutateAsync = vi.fn(async () => ({}));
const updatePostMutateAsync = vi.fn(async () => ({}));
const fetchLinkPreviewMock = vi.fn(async (url: string) => ({
  url,
  title: "Preview title",
  description: "Preview description",
  image: null,
  domain: "youtube.com",
  provider: "youtube" as const,
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
  useCreatePost: () => ({ mutateAsync: createPostMutateAsync }),
  useUpdatePost: () => ({ mutateAsync: updatePostMutateAsync }),
}));

vi.mock("../../api/postsApi", () => ({
  fetchLinkPreview: fetchLinkPreviewMock,
}));

vi.mock("@/features/onboarding/api/onboardingApi", () => ({
  resolveOnboardingFilmsFromTmdb: vi.fn(async () => []),
}));

vi.mock("@/features/profile/api/mediaApi", () => ({
  presignProfileMediaUpload: vi.fn(),
  uploadToPresignedUrl: vi.fn(),
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
  createPostMutateAsync.mockClear();
  updatePostMutateAsync.mockClear();
  fetchLinkPreviewMock.mockClear();
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
      expect(createPostMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(createPostMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        body: `lit ${youtubeUrl}`,
      })
    );
  });

});
