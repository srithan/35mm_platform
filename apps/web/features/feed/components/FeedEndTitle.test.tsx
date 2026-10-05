import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeedEndTitle } from "./FeedEndTitle";

describe("FeedEndTitle", function () {
  it("announces the end of a feed with its contextual message", function () {
    render(<FeedEndTitle message="That’s a wrap. You’re all caught up." />);

    const endTitle = screen.getByRole("status", { name: "End of feed" });
    expect(endTitle).toHaveTextContent("That’s a wrap. You’re all caught up.");
    expect(endTitle.firstElementChild).toHaveClass("font-sans", "text-[14px]", "font-medium");
    expect(endTitle.firstElementChild).not.toHaveClass("font-display", "font-display-discover");
  });
});
