import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", function () {
  it("paints the backdrop and blur immediately while the panel animates", function () {
    render(
      <Modal open onClose={vi.fn()} ariaLabel="Example modal">
        <p>Modal content</p>
      </Modal>
    );

    const dialog = screen.getByRole("dialog", { name: "Example modal" });
    const backdrop = document.querySelector<HTMLElement>("[data-modal-backdrop]");
    const viewport = dialog.parentElement;

    expect(backdrop).not.toBeNull();
    expect(backdrop).toHaveClass("bg-black/60", "backdrop-blur-sm");
    expect(backdrop).not.toHaveStyle({ opacity: "0" });
    expect(viewport).not.toHaveStyle({ opacity: "0" });
    expect(dialog).toHaveStyle({ opacity: "0" });
  });
});
