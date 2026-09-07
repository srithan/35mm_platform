import type { FeedPost } from "@35mm/types";
import { MobileUIProvider, SafeAreaProvider } from "@35mm/mobile-ui";
import { RICH_TEXT_PREFIX } from "@35mm/validators/rich-text";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { buildPostActionSections, PostCard } from "@/features/feed/PostCard";

jest.mock("@/features/videos/usePostInteractions", () => ({
  usePostInteractions: () => ({
    like: { error: null, isPending: false, mutate: jest.fn() },
    repost: { error: null, isPending: false, mutate: jest.fn() },
    bookmark: { error: null, isPending: false, mutate: jest.fn() },
    remove: { error: null, isPending: false, mutate: jest.fn() },
  }),
}));

jest.mock("@/features/videos/BunnyVideoPlayer", () => ({
  BunnyVideoPlayer: () => null,
}));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <MobileUIProvider preference="light" reduceMotion systemColorScheme="light">
        {children}
      </MobileUIProvider>
    </SafeAreaProvider>
  );
}

const POST: FeedPost = {
  id: "530784aa-d70d-4c51-b846-2fea9ff2c632",
  author: {
    id: "user-1",
    username: "tony",
    displayName: "Tony",
    avatarUrl: null,
  },
  type: "text",
  nsfw: { status: "none", categories: [], source: null },
  body: `${RICH_TEXT_PREFIX}${JSON.stringify({
    type: "doc",
    content: [{
      type: "paragraph",
      content: [
        { type: "text", text: "Good morning, " },
        { type: "text", marks: [{ type: "bold" }], text: "Animal" },
        { type: "text", text: " lovers!" },
      ],
    }],
  })}`,
  media: [],
  linkPreview: null,
  film: null,
  poll: null,
  createdAt: "2026-09-06T12:00:00.000Z",
  updatedAt: "2026-09-06T12:00:00.000Z",
  likeCount: 1,
  commentCount: 3,
  repostCount: 0,
  bookmarkCount: 0,
  quoteCount: 0,
  isLiked: false,
  isReposted: false,
  isBookmarked: false,
  repostContext: null,
  quotedPost: null,
  quotedPostUnavailable: false,
};

describe("mobile feed post card", () => {
  it("renders stored rich text instead of exposing its serialized payload", async () => {
    await render(
      <Providers>
        <PostCard
          active
          autoplay={false}
          currentUserId="viewer-1"
          onOpenPost={jest.fn()}
          post={POST}
          startWithSound={false}
        />
      </Providers>,
    );

    expect(screen.getByText("Animal")).toHaveStyle({ fontWeight: "700" });
    expect(screen.queryByText(/__35MM_RICH_TEXT_V1__/)).not.toBeOnTheScreen();
  });

  it("opens comments and exposes More actions for every author", async () => {
    const openPost = jest.fn();
    await render(
      <Providers>
        <PostCard
          active
          autoplay={false}
          currentUserId="viewer-1"
          onOpenPost={openPost}
          post={POST}
          startWithSound={false}
        />
      </Providers>,
    );

    fireEvent.press(screen.getByRole("button", { name: "Open comments" }));
    expect(openPost).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId(`post-card-${POST.id}`));
    expect(openPost).toHaveBeenCalledTimes(2);
    expect(screen.getByText("3")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "More post actions" }));
    expect(openPost).toHaveBeenCalledTimes(2);

    const sections = buildPostActionSections({
      bookmarkPending: false,
      deletePending: false,
      isBookmarked: false,
      isOwner: false,
      onBookmark: jest.fn(),
      onDelete: jest.fn(),
      onShare: jest.fn(),
    });
    expect(sections.flatMap((section) => section.actions).map((action) => action.label)).toEqual([
      "Share post",
      "Bookmark post",
    ]);

    const ownerSections = buildPostActionSections({
      bookmarkPending: false,
      deletePending: false,
      isBookmarked: true,
      isOwner: true,
      onBookmark: jest.fn(),
      onDelete: jest.fn(),
      onShare: jest.fn(),
    });
    expect(ownerSections.flatMap((section) => section.actions).map((action) => action.label)).toEqual([
      "Share post",
      "Remove bookmark",
      "Delete post",
    ]);
  });
});
