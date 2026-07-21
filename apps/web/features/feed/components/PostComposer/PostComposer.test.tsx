import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseStoredRichText, storedRichTextToPlainText } from "@/lib/utils/richContent";
import { PostComposer } from "./index";
import { postComposerWritePrompt } from "./writePrompt";
import { presignProfileMediaUpload, uploadToPresignedUrl } from "@/features/profile/api/mediaApi";

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
  searchMentionSuggestionsMock: vi.fn(async () => [
    {
      id: "11111111-1111-4111-8111-111111111111",
      username: "ava",
      displayName: "Ava DuVernay",
      avatarUrl: null,
      isFollowing: true,
    },
  ]),
}));

const WRITE_PLACEHOLDER = postComposerWritePrompt("Test User");

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

vi.mock("../../api/mentionsApi", () => ({
  searchMentionSuggestions: mocks.searchMentionSuggestionsMock,
}));

vi.mock("@/features/feed/api/mentionsApi", () => ({
  searchMentionSuggestions: mocks.searchMentionSuggestionsMock,
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
  mocks.searchMentionSuggestionsMock.mockClear();
  vi.mocked(presignProfileMediaUpload).mockReset();
  vi.mocked(uploadToPresignedUrl).mockReset();
});

function findMentionNode(node: any): any | null {
  if (!node || typeof node !== "object") return null;
  if (node.type === "mention") return node;
  for (const child of node.content ?? []) {
    const found = findMentionNode(child);
    if (found) return found;
  }
  return null;
}

function storedBody(text: string): string {
  return (
    "__35MM_RICH_TEXT_V1__" +
    JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text }],
        },
      ],
    })
  );
}

describe("PostComposer", () => {
  it("keeps pasted YouTube URL in text and submits it", async () => {
    const user = userEvent.setup();
    render(<PostComposer variant="inline" />);
    const textarea = screen.getByPlaceholderText(WRITE_PLACEHOLDER);
    const youtubeUrl = "https://www.youtube.com/watch?v=qU4bAFjBXUI";

    await user.click(textarea);
    await user.type(textarea, "lit ");
    await user.paste(youtubeUrl);

    expect(textarea).toHaveTextContent(`lit ${youtubeUrl}`);

    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(mocks.createPostMutateAsync).toHaveBeenCalledTimes(1);
    });

    var input = (mocks.createPostMutateAsync.mock.calls[0] as unknown[])[0] as {
      body: string;
      linkPreview: {
        url: string;
        title: string;
        presentation: "card_only" | "url_and_card";
      } | null;
    };
    expect(storedRichTextToPlainText(input.body)).toBe(`lit ${youtubeUrl}`);
    expect(input.linkPreview).toMatchObject({
      url: youtubeUrl,
      title: "Preview title",
      presentation: "url_and_card",
    });
  });

  it("shows one playable video preview with fetched title for a standalone video URL", async () => {
    const user = userEvent.setup();
    render(<PostComposer variant="inline" />);
    const editor = screen.getByRole("combobox", { name: WRITE_PLACEHOLDER });
    const url = "https://www.youtube.com/watch?v=np8O_0B-Rvc&t=21s";

    await user.click(editor);
    await user.paste(url);

    const playButton = await screen.findByRole("button", { name: "Play Preview title" });
    expect(screen.getAllByText("Preview title")).toHaveLength(1);
    expect(screen.queryByRole("checkbox", { name: "Show URL in post" })).not.toBeInTheDocument();

    expect(playButton).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(mocks.createPostMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          linkPreview: expect.objectContaining({
            url,
            presentation: "card_only",
          }),
        })
      );
    });
  });

  it("submits the quoted source post id", async () => {
    const user = userEvent.setup();
    const quotedPostId = "11111111-1111-4111-8111-111111111112";
    render(
      <PostComposer
        variant="inline"
        quotedPost={{
          postId: quotedPostId,
          displayName: "Original Author",
          handle: "@original",
          avatarInitial: "O",
          text: "Original post body",
          timestamp: "2m",
        }}
      />
    );

    const editor = screen.getByRole("combobox", { name: WRITE_PLACEHOLDER });
    await user.click(editor);
    await user.type(editor, "My take");
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(mocks.createPostMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ quotedPostId })
      );
    });
  });

  it("accepts pasted clipboard image files", async () => {
    render(<PostComposer variant="inline" />);
    const textarea = screen.getByPlaceholderText(WRITE_PLACEHOLDER);
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

  it("submits uploaded image posts with the original R2 URL until variants are processed", async () => {
    vi.mocked(presignProfileMediaUpload).mockResolvedValue({
      uploadUrl: "https://upload.example.com/signed",
      publicUrl: "https://media.example.com/users/user_1/post_media/photo.jpg",
      objectKey: "users/user_1/post_media/photo.jpg",
      contentType: "image/jpeg",
      expiresInSeconds: 900,
      variants: {
        thumb: "https://media.example.com/users/user_1/post_media/photo__thumb.webp",
        feed: "https://media.example.com/users/user_1/post_media/photo__feed.webp",
        full: "https://media.example.com/users/user_1/post_media/photo__full.webp",
      },
    });
    vi.mocked(uploadToPresignedUrl).mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<PostComposer variant="inline" />);
    const textarea = screen.getByPlaceholderText(WRITE_PLACEHOLDER);
    const file = new File(["image-bytes"], "photo.jpg", { type: "image/jpeg" });

    fireEvent.paste(textarea, {
      clipboardData: {
        items: [
          {
            kind: "file",
            type: "image/jpeg",
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

    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(mocks.createPostMutateAsync).toHaveBeenCalledTimes(1);
    });

    var input = (mocks.createPostMutateAsync.mock.calls[0] as unknown[])[0] as {
      media: Array<{ url: string; variants?: Record<string, string> }>;
      mediaUrls: string[];
    };
    expect(input.mediaUrls).toEqual(["https://media.example.com/users/user_1/post_media/photo.jpg"]);
    expect(input.media[0]).toMatchObject({
      type: "image",
      url: "https://media.example.com/users/user_1/post_media/photo.jpg",
      key: "users/user_1/post_media/photo.jpg",
    });
    expect(input.media[0]?.variants).toBeUndefined();
  });

  it("opens mention autocomplete and inserts stable mention node", async () => {
    const user = userEvent.setup();
    render(<PostComposer variant="inline" />);
    const editor = screen.getByRole("combobox", { name: WRITE_PLACEHOLDER });

    await user.click(editor);
    await user.type(editor, "@av");

    var listbox = await screen.findByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(listbox).toHaveClass("z-[calc(var(--z-composer)+10)]");
    expect(await screen.findByRole("option", { name: /Ava DuVernay/i })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /Ava DuVernay/i }));
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(mocks.createPostMutateAsync).toHaveBeenCalledTimes(1);
    });

    var input = (mocks.createPostMutateAsync.mock.calls[0] as unknown[])[0] as { body: string };
    var mention = findMentionNode(parseStoredRichText(input.body));
    expect(mention?.attrs).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      username: "ava",
      label: "ava",
    });
  });

  it("hydrates edit post body into the write editor", async () => {
    const body = storedBody("Existing post body");

    render(
      <PostComposer
        variant="modal"
        editingPost={{
          postId: "post_1",
          userId: "11111111-1111-4111-8111-111111111111",
          type: "text",
          body,
        }}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: WRITE_PLACEHOLDER })
      ).toHaveTextContent("Existing post body");
    });
  });

  it("persists a newly added link preview while editing", async () => {
    const user = userEvent.setup();
    const youtubeUrl = "https://www.youtube.com/watch?v=qU4bAFjBXUI";

    render(
      <PostComposer
        variant="modal"
        editingPost={{
          postId: "post_1",
          userId: "11111111-1111-4111-8111-111111111111",
          type: "text",
          body: storedBody(`Edited post ${youtubeUrl}`),
          linkPreview: null,
        }}
      />
    );

    await waitFor(() => {
      expect(mocks.fetchLinkPreviewMock).toHaveBeenCalledWith(youtubeUrl, "test-token");
    });
    expect(await screen.findByText("Preview title")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mocks.updatePostMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: "post_1",
          linkPreview: expect.objectContaining({
            url: youtubeUrl,
            title: "Preview title",
          }),
        })
      );
    });
  });

  it("hydrates edit discussion headline and body", async () => {
    render(
      <PostComposer
        variant="modal"
        editingPost={{
          postId: "post_1",
          userId: "11111111-1111-4111-8111-111111111111",
          type: "discussion",
          headline: "Existing discussion headline",
          body: storedBody("Existing discussion body"),
        }}
      />
    );

    expect(screen.getByPlaceholderText("What's your question or take?")).toHaveValue(
      "Existing discussion headline"
    );

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: "Add more context... (optional)" })
      ).toHaveTextContent("Existing discussion body");
    });
  });

  it("hydrates edit log body and attached film", async () => {
    render(
      <PostComposer
        variant="modal"
        editingPost={{
          postId: "post_1",
          userId: "11111111-1111-4111-8111-111111111111",
          type: "log",
          body: storedBody("Existing log note"),
          film: {
            id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
            tmdbId: 550,
            title: "Fight Club",
            year: 1999,
            posterUrl: "/poster.jpg",
            genres: ["Drama"],
            rating: 8,
          },
        }}
      />
    );

    expect(screen.getByText("Fight Club")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", {
          name: "Optional note. 200+ characters turns this into a review.",
        })
      ).toHaveTextContent("Existing log note");
    });
  });

  it("submits log with postToFeed false when unchecked", async () => {
    const user = userEvent.setup();
    render(<PostComposer variant="inline" initialMode="log" />);

    expect(
      screen.getByRole("combobox", { name: "Select a film to add a note or review." })
    ).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("button", { name: "Pick film" }));

    expect(
      screen.getByRole("combobox", { name: "Optional note. 200+ characters turns this into a review." })
    ).toHaveAttribute("aria-disabled", "false");

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
