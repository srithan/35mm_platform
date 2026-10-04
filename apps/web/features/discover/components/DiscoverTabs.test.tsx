import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoverTabs } from "./DiscoverTabs";

const flags = vi.hoisted(function () {
  return { browseRailEnabled: true, focusedNavigationEnabled: false };
});

vi.mock("@/lib/config/uiFlags", function () {
  return {
    get BROWSE_CHROME_VARIANT() {
      return flags.focusedNavigationEnabled ? "focused" : "classic";
    },
    get BROWSE_DENSITY_VARIANT() {
      return flags.browseRailEnabled ? "compact" : "classic";
    },
  };
});

describe("DiscoverTabs", function () {
  beforeEach(function () {
    flags.focusedNavigationEnabled = false;
    flags.browseRailEnabled = true;
  });

  it("links Discover, Films, Lists, and Contribute in order and marks the active section", function () {
    render(<DiscoverTabs active="lists" />);

    const links = screen.getAllByRole("link");
    expect(links.map(function (link) { return link.textContent; })).toEqual([
      "Discover",
      "Films",
      "Lists",
      "Contribute",
    ]);
    expect(links.map(function (link) { return link.getAttribute("href"); })).toEqual([
      "/discover",
      "/films",
      "/lists",
      "/contribute",
    ]);
    expect(screen.getByRole("link", { name: "Lists" })).toHaveAttribute("aria-current", "page");

    const subnav = screen.getByRole("navigation", { name: "Explore 35mm" });
    expect(subnav).toHaveClass("bg-bg");
    expect(subnav).not.toHaveClass("bg-bg/95", "backdrop-blur-md");
  });

  it("renders the shared opaque focused browse menu with Discover, Films, and Lists", function () {
    flags.focusedNavigationEnabled = true;

    render(<DiscoverTabs active="films" />);

    const nav = screen.getByRole("navigation", { name: "Discover navigation" });
    const links = screen.getAllByRole("link");
    expect(links.map(function (link) { return link.textContent; })).toEqual([
      "Discover",
      "Films",
      "Lists",
    ]);
    expect(screen.queryByRole("link", { name: "Contribute" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Films" })).toHaveAttribute("aria-current", "page");
    expect(nav).toHaveClass(
      "min-h-[62px]",
      "sm:justify-center"
    );
    expect(nav.parentElement).toHaveClass("bg-bg", "border-border");
    expect(nav.parentElement).not.toHaveClass("bg-bg/95", "backdrop-blur-md");
    expect(screen.getByRole("link", { name: "Films" })).toHaveClass(
      "rounded-full",
      "bg-fg",
      "text-bg"
    );
  });

  it("keeps the previous focused strip when browse rail is disabled", function () {
    flags.focusedNavigationEnabled = true;
    flags.browseRailEnabled = false;

    render(<DiscoverTabs active="discover" />);

    const nav = screen.getByRole("navigation", { name: "Discover navigation" });
    expect(nav).toHaveClass("hidden", "md:block", "border-b-0");
    expect(screen.getByRole("link", { name: "Discover" })).toHaveClass("rounded-lg");
  });

  it("does not render a focused navigation strip on Contribute", function () {
    flags.focusedNavigationEnabled = true;

    const { container } = render(<DiscoverTabs active="contribute" />);

    expect(container).toBeEmptyDOMElement();
  });
});
