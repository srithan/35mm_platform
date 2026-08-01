import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostComposerModal } from "./index";

vi.mock("../PostComposer", () => ({
  PostComposer: () => <div style={{ height: 2400 }}>Oversized composer content</div>,
}));

vi.mock("@/components/Icon/Icon", () => ({
  Icon: () => <span aria-hidden />,
}));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(max-width: 767px)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("PostComposerModal", () => {
  it("uses intrinsic height while bounding oversized content to the viewport", async () => {
    render(
      <PostComposerModal
        isOpen
        onClose={vi.fn()}
        user={{ name: "Test User", avatarUrl: null, initial: "T" }}
      />
    );

    await waitFor(() => {
      expect(
        document.querySelector("[data-post-composer-modal-panel]")
      ).toBeInTheDocument();
    });

    const viewport = document.querySelector(
      "[data-post-composer-modal-viewport]"
    );
    const panel = document.querySelector("[data-post-composer-modal-panel]");
    const composerRoot = panel?.querySelector("[data-composer-root]");

    expect(viewport).toHaveClass(
      "items-start",
      "overflow-hidden",
      "pt-[12vh]"
    );
    expect(viewport).not.toHaveClass("items-center");
    expect(panel).toHaveClass(
      "h-auto",
      "max-h-[min(680px,80dvh)]",
      "min-h-0",
      "overflow-hidden"
    );
    expect(panel).not.toHaveClass("h-[min(680px,80dvh)]");
    expect(composerRoot).toHaveClass(
      "flex",
      "flex-col",
      "min-h-0",
      "flex-1",
      "overflow-hidden"
    );
  });
});
