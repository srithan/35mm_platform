import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShareModal } from "./ShareModal";

const viewport = vi.hoisted(function () {
  return { isDesktopMd: false };
});

vi.mock("@/lib/hooks/useIsDesktopMd", function () {
  return {
    useIsDesktopMd: function () {
      return viewport.isDesktopMd;
    },
  };
});

describe("ShareModal", function () {
  it("renders as a bottom sheet below the md breakpoint", function () {
    viewport.isDesktopMd = false;

    render(
      <ShareModal
        open
        onClose={vi.fn()}
        url="https://35mm.in/posts/post_1"
        title="Share post"
      />
    );

    const dialog = screen.getByRole("dialog", { name: "Share" });
    expect(dialog).toHaveAttribute("data-modal-variant", "bottomSheet");
    expect(dialog).toHaveClass("rounded-t-[32px]");
    expect(dialog.querySelector("[data-bottom-sheet-handle]")).not.toBeNull();
  });

  it("keeps the centered dialog on desktop", function () {
    viewport.isDesktopMd = true;

    render(
      <ShareModal
        open
        onClose={vi.fn()}
        url="https://35mm.in/testuser"
        title="Share profile"
      />
    );

    const dialog = screen.getByRole("dialog", { name: "Share" });
    expect(dialog).toHaveAttribute("data-modal-variant", "centered");
    expect(dialog).toHaveClass("rounded-2xl");
    expect(dialog.querySelector("[data-bottom-sheet-handle]")).toBeNull();
  });
});
