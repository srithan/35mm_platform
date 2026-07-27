import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatePicker } from "./DatePicker";

function ControlledDatePicker({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);

  return (
    <>
      <DatePicker id="dob" value={value} onChange={setValue} />
      <output data-testid="dob-value">{value}</output>
    </>
  );
}

describe("DatePicker", function () {
  afterEach(function () {
    document.body.style.pointerEvents = "";
  });

  it("keeps its body portal interactive while nested in a modal", function () {
    document.body.style.pointerEvents = "none";
    const onChange = vi.fn();

    render(
      <div style={{ pointerEvents: "auto" }}>
        <DatePicker id="dob" value="" onChange={onChange} />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: "Select date" }));

    const picker = screen.getByRole("dialog", { name: "Choose date of birth" });
    expect(picker).toHaveClass("pointer-events-auto");

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));

    expect(screen.getByRole("dialog", { name: "Choose date of birth" })).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("commits a selected year to an existing date", async function () {
    const user = userEvent.setup();
    const selectedYear = 1980;

    render(<ControlledDatePicker initialValue="1995-04-10" />);

    await user.click(screen.getByRole("button", { name: "April 10, 1995" }));
    await user.click(screen.getByRole("button", { name: "Year" }));
    await user.click(screen.getByRole("option", { name: String(selectedYear) }));

    expect(screen.getByRole("button", { name: "Year" })).toHaveTextContent(
      String(selectedYear)
    );
    expect(screen.getByTestId("dob-value")).toHaveTextContent("1980-04-10");
    expect(document.getElementById("dob")).toHaveAccessibleName("April 10, 1980");
    expect(screen.queryByRole("listbox", { name: "Year" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Choose date of birth" })).toBeVisible();
  });

  it("clamps leap day when selecting a non-leap year", async function () {
    const user = userEvent.setup();

    render(<ControlledDatePicker initialValue="2000-02-29" />);

    await user.click(screen.getByRole("button", { name: "February 29, 2000" }));
    await user.click(screen.getByRole("button", { name: "Year" }));
    await user.click(screen.getByRole("option", { name: "2001" }));

    expect(screen.getByTestId("dob-value")).toHaveTextContent("2001-02-28");
    expect(document.getElementById("dob")).toHaveAccessibleName("February 28, 2001");
  });

  it("commits a selected month and clamps the existing day", async function () {
    const user = userEvent.setup();

    render(<ControlledDatePicker initialValue="2001-01-31" />);

    await user.click(screen.getByRole("button", { name: "January 31, 2001" }));
    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(screen.getByRole("option", { name: "February" }));

    expect(screen.getByTestId("dob-value")).toHaveTextContent("2001-02-28");
    expect(document.getElementById("dob")).toHaveAccessibleName("February 28, 2001");
  });

  it("uses year selection as navigation when no date exists yet", async function () {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DatePicker id="dob" value="" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Select date" }));
    await user.click(screen.getByRole("button", { name: "Year" }));
    await user.click(screen.getByRole("option", { name: "1980" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Year" })).toHaveTextContent("1980");
    expect(screen.getByRole("button", { name: "January 1, 1980" })).toBeVisible();
  });
});
