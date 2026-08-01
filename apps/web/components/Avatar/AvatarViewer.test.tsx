import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvatarViewer } from "./AvatarViewer";

describe("AvatarViewer", function () {
  it("pins its close button to the viewport top-right", function () {
    render(
      <AvatarViewer
        open
        onClose={vi.fn()}
        src="https://example.com/avatar.jpg"
        displayName="Ava"
      />
    );

    expect(screen.getByRole("button", { name: "Close" })).toHaveClass(
      "fixed",
      "right-4",
      "top-4",
      "sm:right-6",
      "sm:top-6"
    );
  });
});
