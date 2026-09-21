import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TopStickyBar } from "./TopStickyBar";

describe("TopStickyBar", function () {
  afterEach(function () {
    vi.restoreAllMocks();
  });

  it("renders title-only chrome without a tab navigation menu", function () {
    const warn = vi.spyOn(console, "warn").mockImplementation(function () {});

    render(
      <TopStickyBar
        tabs={[]}
        activeTabId=""
        title="@cinefan"
        navAriaLabel="Profile sections"
      />
    );

    expect(screen.getByRole("banner")).toHaveTextContent("@cinefan");
    expect(screen.queryByRole("navigation", { name: "Profile sections" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(warn).not.toHaveBeenCalled();
  });
});
