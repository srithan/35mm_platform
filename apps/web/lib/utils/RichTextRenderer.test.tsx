import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichTextRenderer } from "./RichTextRenderer";
import { RichPostInline } from "./richPostText";
import { serializeRichTextDoc, type RichTextDoc } from "./richContent";

function stored(doc: RichTextDoc) {
  return serializeRichTextDoc(doc);
}

describe("RichTextRenderer", () => {
  it("renders spoiler hidden by default and reveals on click", async () => {
    const user = userEvent.setup();
    render(
      <RichTextRenderer
        stored={stored({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "secret", marks: [{ type: "spoiler" }] },
              ],
            },
          ],
        })}
      />
    );

    const spoiler = screen.getByRole("button", { name: "Reveal spoiler" });
    expect(spoiler.className).toContain("spoiler-ink");
    expect(spoiler.querySelector(".spoiler-ink__canvas")).toBeInTheDocument();
    expect(spoiler.querySelector(".spoiler-ink__content")).toHaveAttribute("aria-hidden", "true");

    await user.click(spoiler);
    const revealed = screen.getByRole("button", { name: "Spoiler revealed" });
    expect(revealed.className).toContain("spoiler-ink--revealed");
    expect(revealed.querySelector(".spoiler-ink__canvas")).not.toBeInTheDocument();
    expect(revealed.querySelector(".spoiler-ink__content")).toHaveAttribute("aria-hidden", "false");
  });

  it("renders mention as profile link", () => {
    render(
      <RichTextRenderer
        stored={stored({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
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
        })}
      />
    );

    expect(screen.getByRole("link", { name: "@ava" })).toHaveAttribute("href", "/ava");
  });

  it("renders deleted mention as muted plain text", () => {
    render(
      <RichTextRenderer
        stored={stored({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "mention",
                  attrs: {
                    id: "11111111-1111-4111-8111-111111111111",
                    label: "olduser",
                    deleted: true,
                  },
                },
              ],
            },
          ],
        })}
      />
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("@olduser")).toHaveClass("text-fg-muted");
  });

  it("renders legacy markdown fallback without literal syntax", () => {
    const { container } = render(<RichPostInline text="**bold** _ital_ ~~gone~~ ||secret||" />);
    expect(container).toHaveTextContent("bold ital gone secret");
    expect(container).not.toHaveTextContent("**");
    expect(container).not.toHaveTextContent("~~");
    expect(container).not.toHaveTextContent("||");
  });

  it("renders strikethrough rich text marks", () => {
    const { container } = render(
      <RichTextRenderer
        stored={stored({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "gone", marks: [{ type: "strike" }] },
              ],
            },
          ],
        })}
      />
    );

    expect(container.querySelector("s")).toHaveTextContent("gone");
  });
});
