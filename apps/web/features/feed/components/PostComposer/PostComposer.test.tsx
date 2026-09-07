import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseStoredRichText, storedRichTextToPlainText } from "@/lib/utils/richContent";
import { PostComposer } from "./index";
import { postComposerWritePrompt } from "./writePrompt";
import { presignProfileMediaUpload, uploadToPresignedUrl } from "@/features/profile/api/mediaApi";

const mocks = vi.hoisted(() => ({
  uploadVideo: vi.fn(),
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
  useAuth: () => ({ userId: "user_1", getToken: vi.fn(async () => "test-token") }),
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

vi.mock("@/features/videos/api/videoApi", () => ({ uploadVideo: mocks.uploadVideo }));

vi.mock("@/features/videos/components/BunnyVideoPlayer", () => ({
  BunnyVideoPlayer: function BunnyVideoPlayer({
    assetId,
    initialAspectRatio,
  }: {
    assetId: string;
    initialAspectRatio?: number;
  }) {
    return (
      <div
        data-testid="quoted-video-player"
        data-asset-id={assetId}
        data-initial-aspect-ratio={initialAspectRatio}
      />
    );
  },
}));

vi.mock("@/features/profile/api/mediaApi", () => ({
  presignProfileMediaUpload: vi.fn(),
  uploadToPresignedUrl: vi.fn(),
}));

vi.mock("../../lib/nsfwImageHint", () => ({
  classifyStagedImage: vi.fn(async () => []),
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
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:video-preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

beforeEach(() => {
  mocks.uploadVideo.mockReset();
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
  it("adds selected sensitive categories to the create payload", async () => {
    const user = userEvent.setup();
    render(<PostComposer variant="inline" />);

    await user.type(screen.getByPlaceholderText(WRITE_PLACEHOLDER), "A difficult scene");
    await user.click(screen.getByRole("button", { name: "Content warning" }));
    await user.click(screen.getByRole("checkbox", { name: "Nudity" }));
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(mocks.createPostMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ authorNsfwCategories: ["nudity"] })
      );
    });
  });

  it("keeps content-warning controls hidden until requested", async () => {
    const user = userEvent.setup();
    render(<PostComposer variant="inline" />);

    expect(screen.getByRole("button", { name: "Content warning" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Nudity" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Content warning" }));
    expect(screen.getByRole("checkbox", { name: "Nudity" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close content warning" }));
    expect(screen.queryByRole("checkbox", { name: "Nudity" })).not.toBeInTheDocument();
  });

  it("opens the compact content-warning panel when an advisory hint is detected", async () => {
    const user = userEvent.setup();
    render(<PostComposer variant="inline" />);

    await user.type(
      screen.getByPlaceholderText(WRITE_PLACEHOLDER),
      "The film includes graphic violence."
    );

    await waitFor(
      () => {
        expect(screen.getByRole("checkbox", { name: "Violence" })).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent(
          "This may contain sensitive content"
        );
      },
      { timeout: 1_500 }
    );
  });

  it("omits sensitive categories when none are selected", async () => {
    const user = userEvent.setup();
    render(<PostComposer variant="inline" />);

    await user.type(screen.getByPlaceholderText(WRITE_PLACEHOLDER), "A quiet scene");
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(mocks.createPostMutateAsync).toHaveBeenCalledTimes(1);
    });
    const call = mocks.createPostMutateAsync.mock.calls[0] as unknown[];
    const payload = call[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("authorNsfwCategories");
  });

  it("keeps modal chrome fixed while composer content owns scrolling", () => {
    const { container } = render(<PostComposer variant="modal" />);

    const shell = container.querySelector("[data-post-composer-shell]");
    const scrollRegion = container.querySelector("[data-composer-scroll-region]");

    expect(shell).toHaveClass("flex", "min-h-0", "flex-1", "overflow-hidden");
    expect(scrollRegion).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-y-auto",
      "overscroll-y-contain"
    );
  });

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

  it("shows discussion and log modes for a regular compose", () => {
    render(<PostComposer variant="inline" />);

    expect(screen.getByRole("button", { name: "Discussion" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log / Review" })).toBeInTheDocument();
  });

  it("hides discussion and log modes when quoting", () => {
    render(
      <PostComposer
        variant="inline"
        initialMode="log"
        quotedPost={{
          postId: "11111111-1111-4111-8111-111111111112",
          displayName: "Original Author",
          handle: "@original",
          avatarInitial: "O",
          text: "Original post body",
        }}
      />
    );

    expect(screen.queryByRole("button", { name: "Write" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Discussion" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log / Review" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: WRITE_PLACEHOLDER })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: WRITE_PLACEHOLDER }).closest(".rich-text-editor")).toHaveClass(
      "min-h-[1.625em]"
    );
    expect(screen.getByRole("combobox", { name: WRITE_PLACEHOLDER }).closest(".rich-text-editor")).not.toHaveClass(
      "min-h-[140px]"
    );
  });

  it("collapses the mode-tab header gap when quoting in the modal", () => {
    const { container } = render(
      <PostComposer
        variant="modal"
        onClose={() => undefined}
        quotedPost={{
          postId: "11111111-1111-4111-8111-111111111112",
          displayName: "Original Author",
          handle: "@original",
          avatarInitial: "O",
          text: "Original post body",
        }}
      />
    );

    const contentRow = container.querySelector("[data-composer-scroll-region] > div");

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Write" })).not.toBeInTheDocument();
    expect(contentRow).toHaveClass("pt-[25px]", "pr-14");
    expect(screen.getByRole("combobox", { name: WRITE_PLACEHOLDER }).closest(".rich-text-editor")).toHaveClass(
      "min-h-[1.625em]"
    );
    expect(screen.getByRole("combobox", { name: WRITE_PLACEHOLDER }).closest(".rich-text-editor")).not.toHaveClass(
      "min-h-[170px]"
    );
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

  it("shows the quoted source video in the composer preview", async () => {
    render(
      <PostComposer
        variant="inline"
        quotedPost={{
          postId: "11111111-1111-4111-8111-111111111112",
          displayName: "Srithan Reddy Savela",
          handle: "@srithan",
          avatarInitial: "S",
          text: "Still can't get out of the #VAS vibe. What a film!",
          timestamp: "2d",
          media: [
            {
              type: "video",
              url: "/v1/videos/vas-video/playback",
              videoAssetId: "vas-video",
              width: 1080,
              height: 1920,
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Still can't get out of the #VAS vibe. What a film!")).toBeInTheDocument();
    expect(screen.getByTestId("composer-quoted-post")).toHaveClass("bg-bg", "border-border-strong");
    expect(screen.getByText("Still can't get out of the #VAS vibe. What a film!")).toHaveClass("text-fg");
    expect(screen.getByTestId("quoted-video-player")).toHaveAttribute("data-asset-id", "vas-video");
    expect(screen.getByTestId("quoted-video-player")).toHaveAttribute(
      "data-initial-aspect-ratio",
      "0.5625"
    );
    expect(screen.getByLabelText("Quoted post media")).toBeInTheDocument();
  });

  it("aligns the quoted post with composer text on the full-page mobile composer", () => {
    render(
      <PostComposer
        variant="fullPage"
        postPrimaryPlacement="header"
        quotedPost={{
          postId: "11111111-1111-4111-8111-111111111112",
          displayName: "Original Author",
          handle: "@original",
          avatarInitial: "O",
          text: "Original post body",
        }}
      />
    );

    const quoted = screen.getByTestId("composer-quoted-post");
    const editor = screen.getByRole("combobox", { name: WRITE_PLACEHOLDER }).closest(".rich-text-editor");

    expect(quoted).not.toHaveClass("mx-4");
    expect(quoted).not.toHaveClass("ml-4");
    expect(quoted).not.toHaveClass("ml-[52px]");
    expect(quoted.parentElement).toBe(editor?.parentElement);
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

  it("publishes after upload acknowledgement while video is still processing", async () => {
    var finishUpload: (() => void) | undefined;
    mocks.uploadVideo.mockImplementation(async (params) => {
      params.onProgress(42);
      await new Promise<void>(resolve => { finishUpload = resolve; });
      params.onProgress(100);
      return { id: "video-asset-id", state: "processing", width: 640, height: 360 };
    });

    const user = userEvent.setup();
    const { container } = render(<PostComposer variant="inline" />);
    const input = container.querySelector<HTMLInputElement>('input[accept="video/mp4,video/webm"]');
    expect(input).not.toBeNull();

    const file = new File([new Uint8Array(1024 * 1024)], "scene.mp4", { type: "video/mp4" });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    expect(await screen.findByLabelText("Attached video")).toBeInTheDocument();
    expect(container.querySelector('video[src="blob:video-preview"]')).not.toBeNull();
    expect(mocks.createPostMutateAsync).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByRole("progressbar", { name: "Video upload progress" })).toHaveAttribute(
        "aria-valuenow",
        "42"
      );
    });
    expect(screen.getByText(/Uploading video · 42%/)).toBeInTheDocument();
    expect(mocks.uploadVideo).toHaveBeenCalledWith(expect.objectContaining({ file, purpose: "post", ownerId: "user_1" }));

    await user.click(screen.getByRole("button", { name: "Post" }));
    expect(mocks.uploadVideo).toHaveBeenCalledTimes(1);
    expect(mocks.createPostMutateAsync).not.toHaveBeenCalled();
    finishUpload?.();
    await waitFor(() => {
      expect(mocks.createPostMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          media: [
            expect.objectContaining({
              type: "video",
              url: "/v1/videos/video-asset-id/playback",
              videoAssetId: "video-asset-id",
            }),
          ],
        })
      );
    });
  });

  it("keeps completed uploads ready until Post without uploading twice", async () => {
    mocks.uploadVideo.mockResolvedValue({ id: "ready-asset", state: "ready" });
    const user = userEvent.setup();
    const { container } = render(<PostComposer variant="inline" />);
    const input = container.querySelector<HTMLInputElement>('input[accept="video/mp4,video/webm"]')!;
    fireEvent.change(input, { target: { files: [new File(["video"], "scene.mp4", { type: "video/mp4" })] } });
    expect(await screen.findByText(/Video ready to post/)).toBeInTheDocument();
    expect(mocks.createPostMutateAsync).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(mocks.createPostMutateAsync).toHaveBeenCalled());
    expect(mocks.uploadVideo).toHaveBeenCalledTimes(1);
  });

  it("shows background failures and retries before posting", async () => {
    mocks.uploadVideo.mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce({ id: "retried-asset", state: "ready" });
    const user = userEvent.setup();
    const { container } = render(<PostComposer variant="inline" />);
    const input = container.querySelector<HTMLInputElement>('input[accept="video/mp4,video/webm"]')!;
    fireEvent.change(input, { target: { files: [new File(["video"], "scene.mp4", { type: "video/mp4" })] } });
    expect(await screen.findByText("Network unavailable")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry upload" }));
    expect(await screen.findByText(/Video ready to post/)).toBeInTheDocument();
    expect(mocks.uploadVideo).toHaveBeenCalledTimes(2);
    expect(mocks.createPostMutateAsync).not.toHaveBeenCalled();
  });

  it("cancels removed uploads and ignores late progress", async () => {
    let params!: Parameters<typeof import("@/features/videos/api/videoApi").uploadVideo>[0];
    mocks.uploadVideo.mockImplementation((input) => {
      params = input;
      return new Promise(() => {});
    });
    const user = userEvent.setup();
    const { container, unmount } = render(<PostComposer variant="inline" />);
    const input = container.querySelector<HTMLInputElement>('input[accept="video/mp4,video/webm"]')!;
    fireEvent.change(input, { target: { files: [new File(["video"], "scene.mp4", { type: "video/mp4" })] } });
    await user.click(screen.getByRole("button", { name: "Remove video" }));
    expect(params.signal?.aborted).toBe(true);
    params.onProgress(88);
    expect(screen.queryByLabelText("Attached video")).not.toBeInTheDocument();
    fireEvent.change(input, { target: { files: [new File(["new"], "other.mp4", { type: "video/mp4" })] } });
    unmount();
    expect(params.signal?.aborted).toBe(true);
  });

  it("rejects unsupported video formats before upload", async () => {
    const { container } = render(<PostComposer variant="inline" />);
    const input = container.querySelector<HTMLInputElement>('input[accept="video/mp4,video/webm"]');
    const file = new File(["video"], "scene.mov", { type: "video/quicktime" });

    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    expect(await screen.findByText("Choose an MP4 or WebM video.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Attached video")).not.toBeInTheDocument();
    expect(presignProfileMediaUpload).not.toHaveBeenCalled();
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

  it("submits a short title review with canonical film identity and requires text", async () => {
    const user = userEvent.setup();
    const dirty = vi.fn();
    render(<PostComposer variant="inline" initialMode="log" onDirtyChange={dirty} initialFilm={{
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAV", tmdbId: 550, title: "Fight Club",
      year: 1999, posterUrl: null, genres: ["Drama"], rating: null,
    }} />);
    expect(screen.getByText("Fight Club")).toBeInTheDocument();
    expect(dirty).toHaveBeenLastCalledWith(false);
    const editor = screen.getByRole("combobox", { name: "What stood out? Performances, craft, themes - spoil carefully." });
    expect(editor).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
    await user.click(editor);
    await user.keyboard("That final scene stayed with me.");
    await user.click(screen.getByRole("button", { name: "Review" }));
    await waitFor(() => expect(mocks.createPostMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ type: "review", film: expect.objectContaining({ id: "01ARZ3NDEKTSV4RRFFQ69G5FAV" }) })));
    expect(mocks.resolveOnboardingFilmsMock).not.toHaveBeenCalled();
  });

});
