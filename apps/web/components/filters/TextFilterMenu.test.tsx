import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TextFilterMenu } from "./TextFilterMenu";

describe("TextFilterMenu", function () {
  it("exposes a subtle text trigger and commits a menu choice", async function () {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <TextFilterMenu
        ariaLabel="Sort lists"
        value="popular"
        triggerLabel="Sort: Popular"
        options={[
          { value: "popular", label: "Popular" },
          { value: "recent", label: "Recent" },
        ]}
        onValueChange={onValueChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Sort lists" })).toHaveTextContent(
      "Sort: Popular",
    );
    expect(container.querySelector("select")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Sort lists" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Recent" }));

    expect(onValueChange).toHaveBeenCalledWith("recent");
  });
});
