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
  it("uses a stable viewport-bounded panel for empty and oversized content", async () => {
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

    expect(viewport).toHaveClass("items-center", "overflow-hidden");
    expect(panel).toHaveClass(
      "h-[min(680px,80dvh)]",
      "max-h-[80dvh]",
      "min-h-0",
      "overflow-hidden"
    );
    expect(composerRoot).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-hidden"
    );
  });
});
