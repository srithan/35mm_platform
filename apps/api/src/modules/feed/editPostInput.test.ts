import { describe, expect, it } from "vitest";
import { parsePatchPostInput } from "./routes.js";

var RICH_TEXT_PREFIX = "__35MM_RICH_TEXT_V1__";

function richLinkBody(url: string): string {
  return (
    RICH_TEXT_PREFIX +
    JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: url,
              marks: [{ type: "link", attrs: { href: url } }],
            },
          ],
        },
      ],
    })
  );
}

describe("parsePatchPostInput", function () {
  it("accepts rich link bodies and replacement preview metadata", function () {
    var url = "https://example.com/story";
    var body = richLinkBody(url);

    expect(
      parsePatchPostInput({
        body,
        linkPreview: {
          url,
          title: "Example story",
          description: null,
          image: "https://example.com/story.jpg",
          domain: "example.com",
          provider: "link",
          presentation: "card_only",
        },
      })
    ).toEqual({
      body,
      linkPreview: {
        url,
        title: "Example story",
        description: null,
        image: "https://example.com/story.jpg",
        domain: "example.com",
        provider: "link",
        presentation: "card_only",
      },
    });
  });

  it("accepts explicitly clearing an existing preview", function () {
    expect(parsePatchPostInput({ linkPreview: null })).toEqual({ linkPreview: null });
  });

  it("returns a concise validation error for unsupported rich text", function () {
    var invalidBody =
      RICH_TEXT_PREFIX +
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "x", marks: [{ type: "code" }] }],
          },
        ],
      });

    expect(function () {
      parsePatchPostInput({ body: invalidBody });
    }).toThrow("Body must be 1-5000 visible characters");
  });
});
