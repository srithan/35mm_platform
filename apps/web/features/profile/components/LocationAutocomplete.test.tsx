import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocationAutocomplete } from "./LocationAutocomplete";

function mockRect(box: {
  top: number;
  left: number;
  width: number;
  height: number;
}): DOMRect {
  return {
    x: box.left,
    y: box.top,
    top: box.top,
    left: box.left,
    bottom: box.top + box.height,
    right: box.left + box.width,
    width: box.width,
    height: box.height,
    toJSON: function () {
      return {};
    },
  } as DOMRect;
}

describe("LocationAutocomplete", function () {
  beforeEach(function () {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async function () {
          return { results: [] };
        },
      })
    );
  });

  afterEach(function () {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("prevents Enter from submitting the parent form while suggestions are open", function () {
    const onSubmit = vi.fn(function (event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
    });
    const onChange = vi.fn();

    render(
      <form onSubmit={onSubmit}>
        <LocationAutocomplete id="location" value="" onChange={onChange} />
        <button type="submit">Save</button>
      </form>
    );

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Lo" } });

    const enter = createEvent.keyDown(input, { key: "Enter" });
    fireEvent(input, enter);

    expect(enter.defaultPrevented).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps the suggestion panel inside the visual viewport", async function () {
    vi.stubGlobal("visualViewport", {
      offsetLeft: 0,
      offsetTop: 0,
      width: 390,
      height: 420,
      addEventListener() {},
      removeEventListener() {},
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.querySelector("#location")) {
        return mockRect({ top: 360, left: 24, width: 342, height: 32 });
      }
      return mockRect({ top: 0, left: 0, width: 0, height: 0 });
    });

    render(<LocationAutocomplete id="location" value="" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Lo" } });

    const panel = await screen.findByRole("listbox");
    await waitFor(function () {
      expect(panel).toHaveStyle({ top: "130px", maxHeight: "224px" });
      expect(Number.parseFloat(panel.style.top)).toBeLessThan(360);
    });
  });

  it("allows selecting a portaled autocomplete option", async function () {
    const onChange = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async function () {
        return {
          results: [
            {
              id: "place-1",
              label: "London · United Kingdom",
              value: "London",
            },
          ],
        };
      },
    } as Response);

    render(<LocationAutocomplete id="location" value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Lo" } });

    const option = await screen.findByRole("option", { name: /London/ });
    expect(screen.getByRole("listbox")).toHaveClass("pointer-events-auto");
    fireEvent.click(option);

    expect(onChange).toHaveBeenLastCalledWith("London");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
