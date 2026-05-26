import { describe, expect, it } from "vitest";
import { resolvePostImageUrls } from "./postMedia";

describe("resolvePostImageUrls", function () {
  var post = {
    mediaUrls: ["https://cdn.example.com/feed-from-media-urls.webp"],
    media: [
      {
        type: "image" as const,
        url: "https://cdn.example.com/original-a.jpg",
        variants: {
          thumb: "https://cdn.example.com/thumb-a.webp",
          feed: "https://cdn.example.com/feed-a.webp",
          full: "https://cdn.example.com/full-a.webp",
        },
      },
      {
        type: "image" as const,
        url: "https://cdn.example.com/original-b.jpg",
        variants: {
          feed: "https://cdn.example.com/feed-b.webp",
        },
      },
      {
        type: "video" as const,
        url: "https://cdn.example.com/video.mp4",
      },
    ],
  };

  it("returns mediaUrls shortcut for feed variant", function () {
    var urls = resolvePostImageUrls(post, "feed");
    expect(urls).toEqual(["https://cdn.example.com/feed-from-media-urls.webp"]);
  });

  it("returns thumb variant, falling back to feed/url", function () {
    var urls = resolvePostImageUrls({ ...post, mediaUrls: [] }, "thumb");
    expect(urls).toEqual([
      "https://cdn.example.com/thumb-a.webp",
      "https://cdn.example.com/feed-b.webp",
    ]);
  });

  it("returns full variant, falling back to source url", function () {
    var urls = resolvePostImageUrls({ ...post, mediaUrls: [] }, "full");
    expect(urls).toEqual([
      "https://cdn.example.com/full-a.webp",
      "https://cdn.example.com/original-b.jpg",
    ]);
  });
});
