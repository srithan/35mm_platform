import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SeventyMmNavigation } from "./SeventyMmNavigation";

const flags = vi.hoisted(function () {
  return { chrome: "classic", density: "classic" };
});

vi.mock("@/lib/config/uiFlags", function () {
  return {
    get BROWSE_CHROME_VARIANT() {
      return flags.chrome;
    },
    get BROWSE_DENSITY_VARIANT() {
      return flags.density;
    },
  };
});

describe("SeventyMmNavigation", function () {
  beforeEach(function () {
    flags.chrome = "classic";
    flags.density = "classic";
  });

  it("shows Browse, Upload, and Studio in product order", function () {
    render(<SeventyMmNavigation active="upload" />);

    expect(
      screen.getByRole("navigation", { name: "70mm navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute(
      "href",
      "/70mm",
    );
    expect(screen.getByRole("link", { name: "Upload" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Studio" })).toHaveAttribute(
      "href",
      "/70mm/studio",
    );
    expect(
      screen.getAllByRole("link").map(function (link) {
        return link.textContent;
      }),
    ).toEqual(["Browse", "Upload", "Studio"]);
    expect(
      screen.queryByRole("link", { name: "70mm browse" }),
    ).not.toBeInTheDocument();
  });

  it("keeps focused styling without adding removed menu items", function () {
    flags.chrome = "focused";
    flags.density = "compact";

    render(<SeventyMmNavigation active="browse" />);

    const nav = screen.getByRole("navigation", { name: "70mm navigation" });
    expect(nav.parentElement).toHaveClass("bg-bg/95", "backdrop-blur-md");
    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Upload" })).toHaveAttribute(
      "href",
      "/70mm/upload",
    );
    expect(screen.getByRole("link", { name: "Studio" })).toHaveAttribute(
      "href",
      "/70mm/studio",
    );
    expect(screen.queryByRole("link", { name: "Community" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Collections" })).toBeNull();
  });

  it("does not enable the focused experience when browse rail is off", function () {
    flags.chrome = "focused";
    flags.density = "classic";

    render(<SeventyMmNavigation active="browse" />);

    expect(screen.getAllByRole("link", { name: "Upload" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Studio" })).toHaveLength(1);
  });
});
