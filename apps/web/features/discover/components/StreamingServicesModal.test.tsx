import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StreamingServicesModal } from "./StreamingServicesModal";

describe("StreamingServicesModal", () => {
  it("searches, adds, removes, and saves the service lineup", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <StreamingServicesModal
        open
        selectedServiceIds={["netflix", "hulu"]}
        saving={false}
        onClose={onClose}
        onSave={onSave}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Remove Netflix" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Hulu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save services" }),
    ).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: "Search services" }), {
      target: { value: "mubi" },
    });
    expect(screen.getByText("1 found")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add MUBI" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Hulu" }));
    fireEvent.click(screen.getByRole("button", { name: "Save services" }));

    await waitFor(function () {
      expect(onSave).toHaveBeenCalledWith(["netflix", "mubi"]);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("shows an actionable empty search state", async () => {
    render(
      <StreamingServicesModal
        open
        selectedServiceIds={[]}
        saving={false}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Search services" }), {
      target: { value: "not a service" },
    });
    expect(screen.getByText("No services found")).toBeInTheDocument();
    expect(screen.getByText("Try another service name.")).toBeInTheDocument();
  });

  it("reorders the lineup and persists the selected order", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <StreamingServicesModal
        open
        selectedServiceIds={["netflix", "hulu", "mubi"]}
        saving={false}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.keyDown(
      screen.getByRole("button", {
        name: "Reorder MUBI. Drag or use arrow keys.",
      }),
      { key: "ArrowUp" },
    );
    expect(
      screen
        .getAllByRole("button", { name: /^Remove / })
        .map(function (button) {
          return button.getAttribute("aria-label");
        }),
    ).toEqual(["Remove Netflix", "Remove MUBI", "Remove Hulu"]);
    fireEvent.click(screen.getByRole("button", { name: "Save services" }));

    await waitFor(function () {
      expect(onSave).toHaveBeenCalledWith(["netflix", "mubi", "hulu"]);
    });
  });

  it("keeps the draft visible and reports a failed save", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValue(new Error("Migration unavailable"));

    render(
      <StreamingServicesModal
        open
        selectedServiceIds={["netflix"]}
        saving={false}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add MUBI" }));
    fireEvent.click(screen.getByRole("button", { name: "Save services" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Services could not be saved. Try again.",
    );
    expect(
      screen.getByRole("button", { name: "Remove MUBI" }),
    ).toBeInTheDocument();
  });
});
