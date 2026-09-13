import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FormattingToolbar } from "./FormattingToolbar";

describe("FormattingToolbar", () => {
  it("reveals formatting on hover above the composer modal and keeps it open while entering the menu", async () => {
    const user = userEvent.setup();
    render(<FormattingToolbar editor={null} />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.hover(screen.getByRole("button", { name: "Formatting options" }));

    const menu = await screen.findByRole("menu", { name: "Formatting options" });
    expect(menu).toHaveClass("z-[calc(var(--z-composer)+2)]");
    for (const name of ["Bold", "Italic", "Underline", "Strikethrough"]) {
      expect(screen.getByRole("menuitemcheckbox", { name })).toBeVisible();
    }

    await user.hover(menu);
    expect(menu).toBeVisible();
    await user.unhover(menu);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });
});
