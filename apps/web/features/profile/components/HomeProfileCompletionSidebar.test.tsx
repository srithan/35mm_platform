import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeProfileCompletionSidebar } from "./HomeProfileCompletionSidebar";

const auth = vi.hoisted(function () {
  return { isLoaded: true, isSignedIn: true };
});

const navigation = vi.hoisted(function () {
  return { pathname: "/" };
});

const flags = vi.hoisted(function () {
  return { browseRailEnabled: true, focusedNavigationEnabled: false };
});

vi.mock("@clerk/nextjs", function () {
  return {
    useAuth: function () {
      return auth;
    },
  };
});

vi.mock("next/navigation", function () {
  return {
    usePathname: function () {
      return navigation.pathname;
    },
  };
});

vi.mock("@/lib/config/uiFlags", function () {
  return {
    get BROWSE_RAIL_MENU_ENABLED() {
      return flags.browseRailEnabled && !flags.focusedNavigationEnabled;
    },
  };
});

vi.mock("./ProfileCompletionWidget", function () {
  return {
    ProfileCompletionWidget: function () {
      return <div>Profile completion</div>;
    },
  };
});

describe("HomeProfileCompletionSidebar", function () {
  beforeEach(function () {
    flags.browseRailEnabled = true;
    flags.focusedNavigationEnabled = false;
  });

  it("renders feed menu links in the left rail", function () {
    auth.isLoaded = true;
    auth.isSignedIn = true;
    navigation.pathname = "/films";

    render(<HomeProfileCompletionSidebar />);

    expect(screen.getByLabelText("Feed sidebar")).toBeInTheDocument();
    const menu = screen.getByLabelText("Feed menu");
    expect(menu).toHaveClass("w-full");
    expect(menu).toHaveClass("max-w-[var(--home-explore-left-rail-width,220px)]");
    expect(menu).not.toHaveClass("ml-auto");
    expect(screen.getByText("Browse")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Your Feed" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute("href", "/discover");
    expect(screen.getByRole("link", { name: "Films" })).toHaveAttribute("href", "/films");
    expect(screen.getByRole("link", { name: "Lists" })).toHaveAttribute("href", "/lists");
    expect(screen.queryByRole("link", { name: "Watchlist" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Films" })).toHaveAttribute("aria-current", "page");
  });

  it("renders the profile setup rail for signed-in users", function () {
    auth.isLoaded = true;
    auth.isSignedIn = true;
    navigation.pathname = "/";

    render(<HomeProfileCompletionSidebar />);

    expect(screen.getByLabelText("Profile setup")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Your Feed" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Profile completion")).toBeInTheDocument();
  });

  it("hides the duplicate browse menu when focused navigation is enabled", function () {
    auth.isLoaded = true;
    auth.isSignedIn = true;
    flags.focusedNavigationEnabled = true;

    render(<HomeProfileCompletionSidebar />);

    expect(screen.getByLabelText("Profile setup")).toBeInTheDocument();
    expect(screen.queryByLabelText("Feed menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Your Feed" })).not.toBeInTheDocument();
    expect(screen.getByText("Profile completion")).toBeInTheDocument();
  });

  it("uses a narrower rail for directory pages", function () {
    auth.isLoaded = true;
    auth.isSignedIn = true;
    navigation.pathname = "/discover";

    render(<HomeProfileCompletionSidebar layout="directory" />);

    const rail = screen.getByLabelText("Feed sidebar");
    expect(rail).toHaveStyle({
      right:
        "calc(50vw + var(--home-explore-center-column-half-width, 432px) + var(--home-sidebar-gap, 2rem))",
      width:
        "min(var(--home-explore-left-rail-width, 220px), calc(min(50vw, 700px) - 1rem - var(--home-explore-center-column-half-width, 432px) - var(--home-sidebar-gap, 2rem)))",
    });
  });

  it("can render directory rail inline for two-column browse pages", function () {
    auth.isLoaded = true;
    auth.isSignedIn = true;
    navigation.pathname = "/discover";

    render(<HomeProfileCompletionSidebar layout="directory" placement="inline" />);

    const rail = screen.getByLabelText("Feed sidebar");
    expect(rail).toHaveClass("sticky");
    expect(rail).toHaveClass("top-[var(--home-profile-sidebar-top)]");
    expect(rail).not.toHaveClass("fixed");
    expect(rail.getAttribute("style")).toContain(
      "--home-profile-sidebar-top: calc(var(--site-header-sticky-offset, 4.5rem) + var(--home-main-below-header-gap, 1rem))"
    );
    expect(rail.getAttribute("style")).toContain(
      "max-height: calc(100vh - var(--site-header-sticky-offset, 4.5rem) - var(--home-main-below-header-gap, 1rem) - env(safe-area-inset-bottom, 0px))"
    );
    expect(rail.getAttribute("style")).not.toContain("right:");
  });

  it("does not render for guests", function () {
    auth.isLoaded = true;
    auth.isSignedIn = false;
    navigation.pathname = "/";

    const { container } = render(<HomeProfileCompletionSidebar />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Profile completion")).not.toBeInTheDocument();
  });
});
