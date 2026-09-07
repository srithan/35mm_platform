import { describe, expect, it } from "vitest";
import { buildComposerQuotedPost, collectQuotedMedia } from "./buildComposerQuotedPost";
import { resolvePostMedia } from "./resolvePostMedia";

describe("collectQuotedMedia", function () {
  it("keeps native video assets from the source media payload", function () {
    expect(
      collectQuotedMedia([
        {
          type: "video",
          url: "/v1/videos/video-id/playback",
          videoAssetId: "video-id",
          thumbnailUrl: "https://cdn.example.com/poster.jpg",
          width: 1080,
          height: 1920,
        },
      ])
    ).toEqual([
      {
        type: "video",
        url: "/v1/videos/video-id/playback",
        videoAssetId: "video-id",
        thumbnailUrl: "https://cdn.example.com/poster.jpg",
        width: 1080,
        height: 1920,
      },
    ]);
  });

  it("falls back to resolved video URLs when media omits typed items", function () {
    const resolved = resolvePostMedia([], ["https://cdn.example.com/clip.mp4"], [], undefined);

    expect(collectQuotedMedia(undefined, resolved)).toEqual([
      {
        type: "video",
        url: "https://cdn.example.com/clip.mp4",
      },
    ]);
  });
});

describe("buildComposerQuotedPost", function () {
  it("copies source video media into the composer quote snapshot", function () {
    const quoted = buildComposerQuotedPost({
      postId: "11111111-1111-4111-8111-111111111112",
      displayName: "Srithan Reddy Savela",
      handle: "@srithan",
      avatarInitial: "S",
      avatarUrl: "https://cdn.example.com/srithan.jpg",
      text: "Still can't get out of the #VAS vibe. What a film!",
      timestamp: "2d",
      media: [
        {
          type: "video",
          url: "/v1/videos/vas-video/playback",
          videoAssetId: "vas-video",
        },
      ],
      linkPreview: {
        url: "https://youtube.com/watch?v=dQw4w9wgGcQ",
        title: "Unused when native video exists",
        description: null,
        image: null,
        domain: "youtube.com",
        provider: "youtube",
        presentation: "card_only",
      },
    });

    expect(quoted.media).toEqual([
      {
        type: "video",
        url: "/v1/videos/vas-video/playback",
        videoAssetId: "vas-video",
      },
    ]);
    expect(quoted.avatarUrl).toBe("https://cdn.example.com/srithan.jpg");
    expect(quoted.linkPreview?.provider).toBe("youtube");
  });
});
