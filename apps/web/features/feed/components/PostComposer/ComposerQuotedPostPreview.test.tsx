import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComposerQuotedPostPreview } from "./ComposerQuotedPostPreview";

vi.mock("@/components/Avatar", function () {
  return {
    Avatar: function Avatar({ initial, src }: { initial?: string; src?: string | null }) {
      return <span data-testid="quote-avatar" data-initial={initial} data-src={src ?? ""} />;
    },
  };
});

vi.mock("@/features/videos/components/BunnyVideoPlayer", function () {
  return {
    BunnyVideoPlayer: function BunnyVideoPlayer({ assetId }: { assetId: string }) {
      return <div data-testid="quoted-video-player" data-asset-id={assetId} />;
    },
  };
});

describe("ComposerQuotedPostPreview", function () {
  it("matches feed quote colors instead of a sunken gray card", function () {
    render(
      <ComposerQuotedPostPreview
        quotedPost={{
          postId: "11111111-1111-4111-8111-111111111112",
          displayName: "Tony",
          handle: "@ynot",
          avatarInitial: "T",
          avatarUrl: "https://cdn.example.com/tony.jpg",
          text: "How the thought of Monday feels",
          timestamp: "1d",
        }}
      />
    );

    const card = screen.getByTestId("composer-quoted-post");
    expect(card).toHaveClass("bg-bg", "border-border-strong");
    expect(card).not.toHaveClass("bg-sunken");
    expect(screen.getByText("How the thought of Monday feels")).toHaveClass("text-fg");
    expect(screen.getByText("Tony")).toHaveClass("text-fg");
    expect(screen.getByTestId("quote-avatar")).toHaveAttribute(
      "data-src",
      "https://cdn.example.com/tony.jpg"
    );
  });
});
