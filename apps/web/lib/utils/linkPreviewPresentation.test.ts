import { describe, expect, it } from "vitest";
import {
  extractFirstHttpUrl,
  inferLinkPreviewPresentation,
  suppressLinkPreviewUrl,
} from "./linkPreviewPresentation";

describe("link preview presentation", function () {
  const url = "https://example.com/story";

  it("defaults a standalone URL line to card-only", function () {
    expect(inferLinkPreviewPresentation(`Worth reading\n\n${url}`, url)).toBe("card_only");
    expect(inferLinkPreviewPresentation(`${url}.`, url)).toBe("card_only");
  });

  it("defaults an inline URL to URL and card", function () {
    expect(inferLinkPreviewPresentation(`Worth reading: ${url}`, url)).toBe("url_and_card");
  });

  it("removes only the matching URL and preserves surrounding copy", function () {
    expect(suppressLinkPreviewUrl(`Worth reading\n\n${url}`, `${url}`)).toBe("Worth reading");
    expect(suppressLinkPreviewUrl(`Compare ${url} with https://example.org`, url)).toBe(
      "Compare with https://example.org"
    );
  });

  it("normalizes root URLs and strips trailing sentence punctuation", function () {
    expect(extractFirstHttpUrl("See https://example.com.")).toBe("https://example.com");
    expect(suppressLinkPreviewUrl("https://example.com", "https://example.com/")).toBe("");
  });
});
