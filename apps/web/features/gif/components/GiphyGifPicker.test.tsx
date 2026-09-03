import { useRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GiphyGifPicker } from "./GiphyGifPicker";

vi.mock("@giphy/js-fetch-api", () => ({
  GiphyFetch: class {
    search = vi.fn(async () => ({ data: [], pagination: {}, meta: {} }));
    trending = vi.fn(async () => ({ data: [], pagination: {}, meta: {} }));
  },
}));

vi.mock("@giphy/react-components", () => ({
  Grid: ({
    onGifClick,
  }: {
    onGifClick: (
      gif: { images: { original: { url: string } } },
      event: React.SyntheticEvent<HTMLElement>
    ) => void;
  }) => (
    <button
      type="button"
      onClick={(event) => onGifClick({
        images: {
          original: { url: "https://media.giphy.com/media/example/giphy.gif" },
        },
      }, event)}
    >
      Choose GIF
    </button>
  ),
}));

function PickerHarness(props: { onSelect: (url: string) => void }) {
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={anchorRef} type="button">GIF trigger</button>
      <GiphyGifPicker
        isOpen
        onClose={() => undefined}
        onSelect={props.onSelect}
        anchorRef={anchorRef}
      />
    </>
  );
}

describe("GiphyGifPicker", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_GIPHY_API_KEY = "test-giphy-key";
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 552 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 420,
      bottom: 456,
      left: 160,
      right: 196,
      width: 36,
      height: 36,
      x: 160,
      y: 420,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders required attribution and returns the selected GIPHY URL", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<PickerHarness onSelect={onSelect} />);

    expect(await screen.findByText("Powered by GIPHY")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose GIF" }));

    expect(onSelect).toHaveBeenCalledWith(
      "https://media.giphy.com/media/example/giphy.gif"
    );
  });

  it("anchors above a bottom composer without overlapping the trigger", async () => {
    render(<PickerHarness onSelect={() => undefined} />);

    const panel = await screen.findByText("Powered by GIPHY");
    const popover = panel.closest<HTMLElement>("[data-composer-popover]");
    expect(popover).not.toBeNull();
    expect(popover?.style.bottom).toBe("140px");
    expect(popover?.style.top).toBe("");
    expect(popover?.style.maxHeight).toBe("402px");
  });
});
