import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WormRadioGroup } from "./WormRadioGroup";

const options = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "c", label: "C" },
  { value: "d", label: "D" },
  { value: "e", label: "E" },
];

describe("WormRadioGroup", function () {
  it("renders any number of radios and positions the worm from the selected index", async function () {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <WormRadioGroup
        aria-label="Letters"
        defaultValue="d"
        name="letters"
        onValueChange={onValueChange}
        options={options}
      />
    );

    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByLabelText("D")).toBeChecked();

    const group = container.querySelector("[data-worm-radio-group]") as HTMLElement;
    expect(group).not.toBeNull();
    expect(group.style.getPropertyValue("--worm-y")).toBe("8.25rem");

    await user.click(screen.getByLabelText("E"));

    expect(screen.getByLabelText("E")).toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith("e");
    expect(group.style.getPropertyValue("--worm-y")).toBe("11rem");
  });
});
