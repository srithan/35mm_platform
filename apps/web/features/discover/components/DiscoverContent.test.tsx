import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoverContent } from "./DiscoverContent";

const flags = vi.hoisted(function () {
  return { browseRailEnabled: true, focusedNavigationEnabled: false };
});

vi.mock("next/navigation", function () {
  return { useRouter: function () { return { push: vi.fn() }; } };
});

vi.mock("@/lib/config/uiFlags", function () {
  return {
    get BROWSE_DENSITY_VARIANT() {
      return flags.browseRailEnabled ? "compact" : "classic";
    },
    get BROWSE_DIRECTORY_TABS_ENABLED() {
      return !flags.browseRailEnabled || flags.focusedNavigationEnabled;
    },
    get BROWSE_CHROME_VARIANT() {
      return flags.focusedNavigationEnabled
        ? "focused"
        : flags.browseRailEnabled
          ? "rail"
          : "classic";
    },
  };
});

vi.mock("./ExploreTabContent", function () {
  return { ExploreTabContent: function () { return <section aria-label="Editorial discovery" />; } };
});

describe("DiscoverContent", function () {
  beforeEach(function () {
    flags.browseRailEnabled = true;
    flags.focusedNavigationEnabled = false;
  });

  it("keeps search and catalog filters off the editorial Discover page", function () {
    render(<DiscoverContent />);

    expect(screen.getByRole("region", { name: "Editorial discovery" })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Discover search and filters")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Explore 35mm" })).not.toBeInTheDocument();
  });

  it("adds desktop discovery navigation when focused navigation is enabled", function () {
    flags.focusedNavigationEnabled = true;

    render(<DiscoverContent />);

    expect(screen.getByRole("navigation", { name: "Discover navigation" })).toHaveClass(
      "hidden",
      "md:block"
    );
    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
