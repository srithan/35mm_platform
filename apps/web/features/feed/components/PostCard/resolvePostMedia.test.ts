import { describe, expect, it } from "vitest";
import { resolvePostMedia } from "./resolvePostMedia";

describe("resolvePostMedia", function () {
  it("preserves stored image dimensions for stable feed layout", function () {
    const resolved = resolvePostMedia(
      [{
        type: "image",
        url: "original.jpg",
        width: 1200,
        height: 1800,
        variants: { feed: "feed.jpg", full: "full.jpg" },
      }],
      ["feed.jpg"],
      ["full.jpg"],
      undefined
    );

    expect(resolved.imageDimensions).toEqual([{ width: 1200, height: 1800 }]);
  });

  it("uses null geometry when legacy media lacks valid dimensions", function () {
    const resolved = resolvePostMedia(
      [{ type: "image", url: "legacy.jpg" }],
      ["legacy.jpg"],
      ["legacy.jpg"],
      undefined
    );

    expect(resolved.imageDimensions).toEqual([null]);
  });
});
