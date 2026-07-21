import { describe, expect, it } from "vitest";
import {
  richTextBodyToVisibleText,
  richTextMentionIds,
  validateRichTextBody,
} from "@35mm/validators";

const RICH_TEXT_PREFIX = "__35MM_RICH_TEXT_V1__";

function rich(value: unknown) {
  return RICH_TEXT_PREFIX + JSON.stringify(value);
}

describe("rich text validation", function () {
  it("accepts supported marks and mention attrs", function () {
    var body = rich({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "hi",
              marks: [{ type: "bold" }, { type: "strike" }, { type: "spoiler" }],
            },
            {
              type: "mention",
              attrs: {
                id: "11111111-1111-4111-8111-111111111111",
                label: "ava",
                username: "ava",
              },
            },
          ],
        },
      ],
    });

    expect(validateRichTextBody(body, 1000)).toBe(body);
    expect(richTextBodyToVisibleText(body)).toBe("hi@ava");
    expect(richTextMentionIds(body)).toEqual(["11111111-1111-4111-8111-111111111111"]);
  });

  it("accepts TipTap http link marks", function () {
    var body = rich({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "https://example.com/story",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "https://example.com/story",
                    target: "_blank",
                    rel: "noopener noreferrer nofollow",
                    class: null,
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(validateRichTextBody(body, 1000)).toBe(body);
    expect(richTextBodyToVisibleText(body)).toBe("https://example.com/story");
  });

  it("rejects unsupported node/mark/attrs", function () {
    expect(() =>
      validateRichTextBody(
        rich({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "x",
                  marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
                },
              ],
            },
          ],
        }),
        1000
      )
    ).toThrow();

    expect(() =>
      validateRichTextBody(
        rich({
          type: "doc",
          content: [{ type: "mention", attrs: { id: "not-a-uuid", label: "ava" } }],
        }),
        1000
      )
    ).toThrow();
  });
});
