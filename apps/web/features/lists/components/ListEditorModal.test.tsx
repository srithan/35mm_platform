import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListEditorModal } from "./ListEditorModal";

// Keep the editor's controls and form semantics real; modal focus is tested separately.
vi.mock("@/components/Dialog/Dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div role="dialog">{children}</div> : null,
}));

describe("ListEditorModal", () => {
  it("submits title, privacy and ranking selections through the existing contract", () => {
    const onSubmit = vi.fn();
    render(<ListEditorModal open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "Create list" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "List title" }), { target: { value: "  City nights  " } });
    fireEvent.click(screen.getByRole("radio", { name: /Private/ }));
    fireEvent.click(screen.getByRole("switch", { name: "Rank this list" }));
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    expect(onSubmit).toHaveBeenCalledWith({ title: "City nights", description: "", visibility: "private", isRanked: true, tags: "" });
  });

  it("preserves existing tags and keeps watchlist editing limited to privacy", () => {
    const { rerender } = render(<ListEditorModal open mode="edit" initialValues={{ title: "Noir", tags: "night, city" }} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: "Tags" })).toHaveValue("night, city");
    rerender(<ListEditorModal open mode="edit" listType="watchlist" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByRole("textbox", { name: "List title" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Public/ })).toBeChecked();
  });

  it("blocks repeated submission while saving and announces errors", () => {
    const onSubmit = vi.fn();
    render(<ListEditorModal open mode="create" initialValues={{ title: "Noir" }} isSubmitting error="Unable to save your list." onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole("button", { name: "Saving…" }).closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to save your list.");
    expect(screen.getByRole("textbox", { name: "List title" })).toBeDisabled();
  });
});
