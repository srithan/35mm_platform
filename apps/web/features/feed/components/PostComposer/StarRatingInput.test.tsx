import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StarRatingInput } from "./StarRatingInput";

function Rating({ initialValue = 0 }: { initialValue?: number }) {
  const [value, setValue] = useState(initialValue);
  return <StarRatingInput value={value} onChange={setValue} />;
}

function preparePointerTarget() {
  const slider = screen.getByRole("slider", { name: "Rating (optional)" });
  vi.spyOn(slider, "getBoundingClientRect").mockReturnValue({
    x: 100, y: 0, left: 100, right: 220, top: 0, bottom: 32, width: 120, height: 32,
    toJSON: () => ({}),
  });
  slider.setPointerCapture = vi.fn();
  slider.releasePointerCapture = vi.fn();
  return slider;
}

describe("StarRatingInput", () => {
  it("starts unrated with an optional, named half-star range", () => {
    render(<Rating />);
    const slider = screen.getByRole("slider", { name: "Rating (optional)" });

    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "5");
    expect(slider).toHaveAttribute("step", "0.5");
    expect(slider).toHaveValue("0");
    expect(slider).toHaveAttribute("aria-valuetext", "Unrated");
    expect(slider).toHaveAccessibleDescription(/arrow keys.*half-star/);
    expect(screen.queryByRole("button", { name: "Clear rating" })).not.toBeInTheDocument();
  });

  it("supports keyboard half-stars, bounds, and returning to unrated", async () => {
    const user = userEvent.setup();
    render(<Rating />);
    const slider = screen.getByRole("slider", { name: "Rating (optional)" });
    await user.tab();
    expect(slider).toHaveFocus();

    await user.keyboard("{ArrowRight}{ArrowUp}{ArrowDown}");
    expect(slider).toHaveValue("0.5");
    expect(slider).toHaveAttribute("aria-valuetext", "0.5 out of 5 stars");

    await user.keyboard("{End}{ArrowUp}");
    expect(slider).toHaveValue("5");
    await user.keyboard("{ArrowLeft}");
    expect(slider).toHaveValue("4.5");
    await user.keyboard("{Home}{ArrowDown}");
    expect(slider).toHaveValue("0");
    expect(slider).toHaveAttribute("aria-valuetext", "Unrated");
  });

  it("selects each star's left half or full value with a pointer", () => {
    render(<Rating />);
    const slider = preparePointerTarget();

    fireEvent.pointerDown(slider, { clientX: 154, button: 0, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerUp(slider, { pointerId: 1 });
    expect(slider).toHaveValue("2.5");
    expect(slider).toHaveFocus();

    fireEvent.pointerDown(slider, { clientX: 166, button: 0, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerUp(slider, { pointerId: 1 });
    expect(slider).toHaveValue("3");
  });

  it("supports touch drag and native range changes from assistive technology", () => {
    render(<Rating />);
    const slider = preparePointerTarget();

    fireEvent.pointerDown(slider, { clientX: 106, button: 0, pointerId: 2, pointerType: "touch" });
    expect(slider).toHaveValue("0.5");
    fireEvent.pointerMove(slider, { clientX: 214, pointerId: 2, pointerType: "touch" });
    fireEvent.pointerUp(slider, { pointerId: 2 });
    expect(slider).toHaveValue("5");

    fireEvent.change(slider, { target: { value: "3.5" } });
    expect(slider).toHaveAttribute("aria-valuetext", "3.5 out of 5 stars");
    expect(screen.getByText("3.5 / 5")).toBeInTheDocument();
  });

  it("previews pointer hover without changing the saved rating", () => {
    render(<Rating initialValue={1} />);
    const slider = preparePointerTarget();

    fireEvent.pointerMove(slider, { clientX: 178, pointerType: "mouse" });
    expect(screen.getByText("3.5 / 5")).toBeInTheDocument();
    expect(slider).toHaveValue("1");
    fireEvent.pointerLeave(slider);
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });

  it("clears the rating and preserves focus for keyboard users", async () => {
    const user = userEvent.setup();
    render(<Rating initialValue={4.5} />);

    await user.click(screen.getByRole("button", { name: "Clear rating" }));
    const slider = screen.getByRole("slider", { name: "Rating (optional)" });
    expect(slider).toHaveValue("0");
    expect(slider).toHaveFocus();
    expect(screen.getByText("Unrated")).toBeInTheDocument();
  });
});
