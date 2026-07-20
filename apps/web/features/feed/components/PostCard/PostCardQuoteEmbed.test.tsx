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

  it("renders a tombstone when the source is inaccessible", function () {
    render(<PostCardQuoteEmbed unavailable />);
    expect(screen.getByTestId("quoted-post-unavailable")).toHaveTextContent(
      "This post is unavailable"
    );
  });
});
