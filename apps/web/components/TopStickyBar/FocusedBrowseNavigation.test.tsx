import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FocusedBrowseNavigation } from "./FocusedBrowseNavigation";

describe("FocusedBrowseNavigation", function () {
  it("renders opaque shared chrome for links and actions", function () {
    const onSelect = vi.fn();

    render(
      <FocusedBrowseNavigation
        activeItemId="all"
        navAriaLabel="Notification sections"
        items={[
          { id: "all", label: "All", badgeCount: 3, onClick: onSelect },
          { id: "mentions", label: "Mentions", href: "/mentions" },
        ]}
      />
    );

    const nav = screen.getByRole("navigation", { name: "Notification sections" });
    expect(nav.parentElement).toHaveClass("bg-bg", "border-border");
    expect(nav.parentElement).not.toHaveClass("bg-bg/95", "backdrop-blur-md");
    expect(screen.getByRole("button", { name: "All 3" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All 3" })).toHaveClass("rounded-full", "bg-fg", "text-bg");
    expect(screen.getByRole("link", { name: "Mentions" })).toHaveAttribute("href", "/mentions");

    fireEvent.click(screen.getByRole("button", { name: "All 3" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
