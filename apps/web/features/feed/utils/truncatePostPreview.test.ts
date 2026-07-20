import { describe, expect, it } from "vitest";
import {
  POST_PREVIEW_GRAPHEME_LIMIT,
  truncatePostPreview,
} from "./truncatePostPreview";

describe("truncatePostPreview", function () {
  it("keeps short posts complete at every viewport", function () {
    expect(
      truncatePostPreview(
        "I would go with the whole TROY series this week to cleanse the 70mm debacle."
      )
    ).toBeNull();
  });

  it("uses one deterministic word-safe cutoff for long posts", function () {
    var text = `${"film ".repeat(100)}ending`;
    var preview = truncatePostPreview(text);

    expect(preview).not.toBeNull();
    expect(preview?.endsWith(" ")).toBe(false);
    expect(Array.from(preview ?? "").length).toBeLessThanOrEqual(
      POST_PREVIEW_GRAPHEME_LIMIT
    );
    expect(truncatePostPreview(text)).toBe(preview);
  });

  it("does not split multi-code-point emoji", function () {
    var family = "👨‍👩‍👧‍👦";
    expect(truncatePostPreview(`${family}${family}x`, 2)).toBe(`${family}${family}`);
  });
});
