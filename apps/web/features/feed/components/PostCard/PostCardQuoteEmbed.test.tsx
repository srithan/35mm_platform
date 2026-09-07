import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PostCardQuoteEmbed } from "./PostCardQuoteEmbed";

const push = vi.fn();

vi.mock("next/navigation", function () {
  return { useRouter: () => ({ push }) };
});

vi.mock("@/components/Avatar", function () {
  return { Avatar: () => <span data-testid="quote-avatar" /> };
});

vi.mock("@/features/videos/components/BunnyVideoPlayer", function () {
  return {
    BunnyVideoPlayer: function BunnyVideoPlayer({ assetId }: { assetId: string }) {
      return <div data-testid="quoted-video-player" data-asset-id={assetId} />;
    },
  };
});

describe("PostCardQuoteEmbed", function () {
  it("renders original author, content, and media and navigates to the source", function () {
    render(
      <PostCardQuoteEmbed
        post={{
          id: "source-post",
          type: "image",
          author: {
            id: "source-user",
            username: "original",
            displayName: "Original Author",
            avatarUrl: null,
            isFollowing: false,
          },
          body: "Original post body",
          media: [{ type: "image", url: "/original.jpg", altText: "Original still" }],
          mediaUrls: ["/original.jpg"],
          linkPreview: null,
          poll: null,
          film: null,
          createdAt: "2026-07-19T16:00:00.000Z",
        }}
      />
    );

    expect(screen.getByText("Original Author")).toBeInTheDocument();
    expect(screen.getByText("@original")).toBeInTheDocument();
    expect(screen.getByText("Original post body")).toBeInTheDocument();
    expect(screen.getByAltText("Original still")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Quoted post by Original Author" }));
    expect(push).toHaveBeenCalledWith("/original/post/source-post");
  });

  it("renders stored rich text instead of exposing its serialized payload", function () {
    const storedBody =
      "__35MM_RICH_TEXT_V1__" +
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Texas is scorching today." }],
          },
        ],
      });

    render(
      <PostCardQuoteEmbed
        post={{
          id: "source-post",
          type: "text",
          author: {
            id: "source-user",
            username: "srithan",
            displayName: "Srithan Reddy Savela",
            avatarUrl: null,
            isFollowing: false,
          },
          body: storedBody,
          media: [],
          mediaUrls: [],
          linkPreview: null,
          poll: null,
          film: null,
          createdAt: "2026-07-11T16:00:00.000Z",
        }}
      />
    );

    expect(screen.getByText("Texas is scorching today.")).toBeInTheDocument();
    expect(screen.queryByText(/35MM_RICH_TEXT_V1/)).not.toBeInTheDocument();
  });

  it("renders a quoted native video player", function () {
    render(
      <PostCardQuoteEmbed
        post={{
          id: "source-post",
          type: "text",
          author: {
            id: "source-user",
            username: "srithan",
            displayName: "Srithan Reddy Savela",
            avatarUrl: null,
            isFollowing: false,
          },
          body: "Still can't get out of the #VAS vibe. What a film!",
          media: [
            {
              type: "video",
              url: "/v1/videos/vas-video/playback",
              videoAssetId: "vas-video",
            },
          ],
          mediaUrls: [],
          linkPreview: null,
          poll: null,
          film: null,
          createdAt: "2026-09-05T16:00:00.000Z",
        }}
      />
    );

    expect(screen.getByTestId("quoted-video-player")).toHaveAttribute("data-asset-id", "vas-video");
  });

  it("uses the portrait pair layout for two quoted images", function () {
    render(
      <PostCardQuoteEmbed
        post={{
          id: "source-post",
          type: "image",
          author: {
            id: "source-user",
            username: "original",
            displayName: "Original Author",
            avatarUrl: null,
            isFollowing: false,
          },
          body: "Original post body",
          media: [
            { type: "image", url: "/first.jpg", altText: "First still" },
            { type: "image", url: "/second.jpg", altText: "Second still" },
          ],
          mediaUrls: ["/first.jpg", "/second.jpg"],
          linkPreview: null,
          poll: null,
          film: null,
          createdAt: "2026-07-19T16:00:00.000Z",
        }}
      />
    );

    expect(screen.getByAltText("First still").closest("[data-nsfw-status]")).toHaveClass(
      "aspect-[4/5]"
    );
    expect(screen.getByAltText("Second still").closest("[data-nsfw-status]")).toHaveClass(
      "aspect-[4/5]"
    );
  });

  it("hides a card-only preview URL without removing the source body", function () {
    const previewUrl = "https://example.com/story";
    render(
      <PostCardQuoteEmbed
        post={{
          id: "source-post",
          type: "text",
          author: {
            id: "source-user",
            username: "original",
            displayName: "Original Author",
            avatarUrl: null,
            isFollowing: false,
          },
          body: `Worth reading\n${previewUrl}`,
          media: [],
          mediaUrls: [],
          linkPreview: {
            url: previewUrl,
            title: "Example story",
            description: null,
            image: null,
            domain: "example.com",
            provider: "link",
            presentation: "card_only",
          },
          poll: null,
          film: null,
          createdAt: "2026-07-19T16:00:00.000Z",
        }}
      />
    );

    expect(screen.getByText("Worth reading")).toBeInTheDocument();
    expect(screen.queryByText(previewUrl)).not.toBeInTheDocument();
    expect(screen.getByText("Example story")).toBeInTheDocument();
  });

  it("renders a tombstone when the source is inaccessible", function () {
    render(<PostCardQuoteEmbed unavailable />);
    expect(screen.getByTestId("quoted-post-unavailable")).toHaveTextContent(
      "This post is unavailable"
    );
  });
});
