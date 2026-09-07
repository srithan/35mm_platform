import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuotedPostMediaGrid, quotedMediaAspectRatio } from "./QuotedPostMediaGrid";

vi.mock("@/features/videos/components/BunnyVideoPlayer", function () {
  return {
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
  };
});

vi.mock("@/features/videos/components/FeedVideoPlayer", function () {
  return {
    FeedVideoPlayer: function FeedVideoPlayer({
      src,
      initialAspectRatio,
    }: {
      src: string;
      initialAspectRatio?: number;
    }) {
      return (
        <video
          data-testid="quoted-native-video"
          src={src}
          data-initial-aspect-ratio={initialAspectRatio}
        />
      );
    },
  };
});

describe("quotedMediaAspectRatio", function () {
  it("returns width/height when both are positive", function () {
    expect(quotedMediaAspectRatio({ width: 1080, height: 1920 })).toBe(0.5625);
  });

  it("returns undefined without usable geometry", function () {
    expect(quotedMediaAspectRatio({})).toBeUndefined();
    expect(quotedMediaAspectRatio({ width: 1080, height: 0 })).toBeUndefined();
  });
});

describe("QuotedPostMediaGrid", function () {
  it("lets a single quoted video keep its source ratio instead of a 16:9 cell", function () {
    render(
      <QuotedPostMediaGrid
        media={[
          {
            type: "video",
            url: "/v1/videos/vas-video/playback",
            videoAssetId: "vas-video",
            width: 1080,
            height: 1920,
          },
        ]}
      />
    );

    const player = screen.getByTestId("quoted-video-player");
    expect(player).toHaveAttribute("data-asset-id", "vas-video");
    expect(player).toHaveAttribute("data-initial-aspect-ratio", "0.5625");
    expect(player.closest("[data-nsfw-status]")).not.toHaveClass("aspect-video");
  });

  it("passes source ratio to a native quoted video fallback", function () {
    render(
      <QuotedPostMediaGrid
        media={[
          {
            type: "video",
            url: "https://cdn.example.com/clip.mp4",
            width: 1920,
            height: 1080,
          },
        ]}
      />
    );

    expect(screen.getByTestId("quoted-native-video")).toHaveAttribute(
      "data-initial-aspect-ratio",
      "1.7777777777777777"
    );
  });
});
