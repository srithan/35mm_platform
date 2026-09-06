import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiscoverTabs } from "./DiscoverTabs";

describe("DiscoverTabs", function () {
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
});
