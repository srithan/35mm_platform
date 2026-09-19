import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShellGrid } from "./ShellGrid";

const mocks = vi.hoisted(() => ({ pathname: "/" }));
const flags = vi.hoisted(() => ({ browseRailEnabled: true, focusedNavigationEnabled: false }));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock("@/components/layout/SiteHeader", () => ({
  SiteHeader: () => <div>Desktop header</div>,
}));

vi.mock("@/components/layout/FocusedNavigationSidebar", () => ({
  FocusedNavigationSidebar: () => <aside aria-label="Primary navigation">Focused navigation</aside>,
}));

vi.mock("@/lib/config/uiFlags", () => ({
  get BROWSE_CHROME_VARIANT() {
    return flags.focusedNavigationEnabled
      ? "focused"
      : flags.browseRailEnabled
        ? "rail"
        : "classic";
  },
  get BROWSE_DENSITY_VARIANT() {
    return flags.browseRailEnabled ? "compact" : "classic";
  },
  get DESKTOP_NAVIGATION_VARIANT() {
    return flags.focusedNavigationEnabled ? "focused-sidebar" : "header";
  },
}));

vi.mock("@/components/layout/MobileHeader", () => ({
  MobileHeader: ({
    onProfileClick,
    compactProfileUsername,
  }: {
    onProfileClick?: () => void;
    compactProfileUsername?: string;
  }) => (
    <button
      type="button"
      onClick={onProfileClick}
      data-compact-profile-username={compactProfileUsername}
    >
      Open menu
    </button>
  ),
}));

vi.mock("@/components/layout/MobileSidebar", () => ({
  MobileSidebar: ({ open }: { open: boolean }) => (
    <aside data-testid="mobile-sidebar" data-open={open} />
  ),
}));

vi.mock("@/components/layout/MobileTabBar", () => ({
  MobileTabBar: ({ sidebarOpen }: { sidebarOpen?: boolean }) => (
    <div data-testid="mobile-tabbar" data-open={sidebarOpen}>
      Mobile tabs
    </div>
  ),
}));

vi.mock("@/components/layout/MobileScrollChromeListener", () => ({
  MobileScrollChromeListener: () => null,
}));

vi.mock("@/components/layout/PostComposerModalContext", () => ({
  ComposerModalProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/auth/components/AuthPromptProvider", () => ({
  AuthPromptProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/feed/components/HomeSuggestionsSidebar", () => ({
  HomeSuggestionsSidebar: () => <div>Suggestions</div>,
}));

vi.mock("@/features/profile/components/HomeProfileCompletionSidebar", () => ({
  HomeProfileCompletionSidebar: ({ layout, placement }: { layout?: string; placement?: string }) => (
    <div data-testid="profile-completion-rail" data-layout={layout ?? "home"}>
      <span data-testid="profile-completion-placement">{placement ?? "fixed"}</span>
      Profile completion
    </div>
  ),
}));

vi.mock("@/lib/hooks/useIsDesktopLg", () => ({
  useIsDesktopLg: () => false,
}));

vi.mock("@/lib/utils/syncSiteHeaderStickyOffset", () => ({
  syncSiteHeaderStickyOffset: vi.fn(),
}));

describe("ShellGrid mobile sidebar", () => {
  beforeEach(() => {
    mocks.pathname = "/";
    flags.browseRailEnabled = true;
    flags.focusedNavigationEnabled = false;
  });

  it("reveals sidebar beneath a horizontal-only page transform", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ShellGrid>
        <div>Feed</div>
      </ShellGrid>
    );
    const surface = container.querySelector("[data-mobile-sidebar-surface]");
    expect(surface).not.toBeNull();
    expect(screen.getByRole("main")).toHaveClass(
      "pt-[calc(var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))-0.25rem)]"
    );
    expect(screen.getByRole("main")).not.toHaveClass("pt-20");
    expect(screen.getByText("Profile completion")).toBeInTheDocument();
    expect(screen.getByTestId("profile-completion-rail")).toHaveAttribute("data-layout", "home");
    expect(screen.getByText("Feed").parentElement).toHaveClass("xl:w-[640px]");
    expect(screen.getByText("Feed").parentElement).not.toHaveClass(
      "xl:w-[var(--home-explore-center-column-width)]"
    );
    expect(surface).toHaveClass("transform-none");
    expect(surface).not.toContainElement(screen.getByTestId("mobile-tabbar"));

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.getByTestId("mobile-sidebar")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("mobile-tabbar")).toHaveAttribute("data-open", "true");
    expect(surface).toHaveClass("translate-x-[var(--mobile-sidebar-width)]");
    expect(surface).toHaveClass("mobile-sidebar-surface-open");
    expect(surface?.className).not.toMatch(/translate-y|scale-/);

    const pageContent = surface?.parentElement as HTMLDivElement;
    expect(pageContent.inert).toBe(true);

    const closeSurface = screen.getByRole("button", { name: "Close navigation menu" });
    expect(closeSurface).toHaveClass("rounded-l-[2rem]");
    await user.click(closeSurface);

    expect(screen.getByTestId("mobile-sidebar")).toHaveAttribute("data-open", "false");
    expect(surface).toHaveClass("transform-none");
    expect(pageContent.inert).toBe(false);
  });

  it("does not render the shared mobile header on the new-post route", () => {
    mocks.pathname = "/new";

    render(
      <ShellGrid>
        <div>New post composer</div>
      </ShellGrid>
    );

    expect(screen.queryByRole("button", { name: "Open menu" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass("pt-0");
    expect(screen.queryByText("Profile completion")).not.toBeInTheDocument();
  });

  it("renders discover in a two-column browse rail layout", () => {
    mocks.pathname = "/discover";

    render(
      <ShellGrid>
        <div>Discover page</div>
      </ShellGrid>
    );

    expect(screen.getByRole("main")).toHaveClass("xl:max-w-none", "xl:mx-0");
    expect(screen.getByRole("main")).toHaveClass(
      "md:pt-[calc(var(--site-header-sticky-offset,4.5rem)+var(--home-main-below-header-gap,1rem))]"
    );
    expect(screen.getByText("Profile completion")).toBeInTheDocument();
    expect(screen.getByTestId("profile-completion-rail")).toHaveAttribute("data-layout", "directory");
    expect(screen.getByTestId("profile-completion-placement")).toHaveTextContent("inline");
    expect(screen.queryByText("Suggestions")).not.toBeInTheDocument();
    expect(screen.getByText("Discover page").parentElement?.parentElement).toHaveClass(
      "xl:grid-cols-[var(--home-explore-left-rail-width)_minmax(0,1fr)]"
    );
    expect(screen.getByText("Discover page").parentElement).toHaveClass(
      "xl:w-full",
      "xl:max-w-none"
    );
    expect(screen.getByText("Discover page").parentElement).not.toHaveClass("xl:col-start-2");
    expect(screen.getByText("Discover page").parentElement).not.toHaveClass("xl:col-span-2");
    expect(screen.getByText("Discover page").parentElement?.parentElement).not.toHaveClass(
      "xl:grid-cols-[minmax(0,1fr)_var(--home-explore-center-column-width)_minmax(0,1fr)]"
    );
  });

  it("renders films in a two-column browse rail layout", () => {
    mocks.pathname = "/films";

    render(
      <ShellGrid>
        <div>Films page</div>
      </ShellGrid>
    );

    expect(screen.getByText("Profile completion")).toBeInTheDocument();
    expect(screen.getByTestId("profile-completion-rail")).toHaveAttribute("data-layout", "directory");
    expect(screen.getByTestId("profile-completion-placement")).toHaveTextContent("inline");
    expect(screen.queryByText("Suggestions")).not.toBeInTheDocument();
    expect(screen.getByText("Films page").parentElement?.parentElement).toHaveClass(
      "xl:grid-cols-[var(--home-explore-left-rail-width)_minmax(0,1fr)]"
    );
    expect(screen.getByText("Films page").parentElement).toHaveClass(
      "xl:w-full",
      "xl:max-w-none"
    );
    expect(screen.getByText("Films page").parentElement).not.toHaveClass("xl:col-start-2");
    expect(screen.getByText("Films page").parentElement?.parentElement).not.toHaveClass(
      "xl:grid-cols-[minmax(0,1fr)_var(--home-explore-center-column-width)_minmax(0,1fr)]"
    );
  });

  it("renders title and people pages in a two-column browse rail layout", () => {
    mocks.pathname = "/film/parasite";

    const { rerender } = render(
      <ShellGrid>
        <div>Title page</div>
      </ShellGrid>
    );

    expect(screen.getByText("Profile completion")).toBeInTheDocument();
    expect(screen.getByTestId("profile-completion-rail")).toHaveAttribute("data-layout", "directory");
    expect(screen.getByTestId("profile-completion-placement")).toHaveTextContent("inline");
    expect(screen.getByText("Title page").parentElement?.parentElement).toHaveClass(
      "xl:grid-cols-[var(--home-explore-left-rail-width)_minmax(0,1fr)]"
    );
    expect(screen.getByText("Title page").parentElement).toHaveClass(
      "xl:w-full",
      "xl:max-w-none"
    );
    expect(screen.getByText("Title page").parentElement).not.toHaveClass("xl:col-start-2");
    expect(screen.getByText("Title page").parentElement).not.toHaveClass("xl:col-span-2");
    expect(screen.getByText("Title page").parentElement?.parentElement).not.toHaveClass(
      "xl:grid-cols-[minmax(0,1fr)_var(--home-explore-center-column-width)_minmax(0,1fr)]"
    );

    mocks.pathname = "/person/bong-joon-ho";

    rerender(
      <ShellGrid>
        <div>Person page</div>
      </ShellGrid>
    );

    expect(screen.getByTestId("profile-completion-rail")).toHaveAttribute("data-layout", "directory");
    expect(screen.getByTestId("profile-completion-placement")).toHaveTextContent("inline");
    expect(screen.getByText("Person page").parentElement?.parentElement).toHaveClass(
      "xl:grid-cols-[var(--home-explore-left-rail-width)_minmax(0,1fr)]"
    );
    expect(screen.getByText("Person page").parentElement).toHaveClass(
      "xl:w-full",
      "xl:max-w-none"
    );
    expect(screen.getByText("Person page").parentElement).not.toHaveClass("xl:col-start-2");
    expect(screen.getByText("Person page").parentElement).not.toHaveClass("xl:col-span-2");
    expect(screen.getByText("Person page").parentElement?.parentElement).not.toHaveClass(
      "xl:grid-cols-[minmax(0,1fr)_var(--home-explore-center-column-width)_minmax(0,1fr)]"
    );
  });

  it("uses a 1240px content column for focused navigation browse, title, and people routes", () => {
    flags.focusedNavigationEnabled = true;
    mocks.pathname = "/discover";

    const { rerender, container } = render(
      <ShellGrid>
        <div>Focused page</div>
      </ShellGrid>
    );

    const assertSingleColumn = function () {
      const main = screen.getByRole("main");
      expect(main).toHaveClass(
        "md:max-w-[var(--focused-navigation-content-max-width)]",
        "md:mx-auto"
      );
      expect(screen.getByText("Focused page").parentElement).toBe(main);
      expect(screen.queryByTestId("profile-completion-rail")).not.toBeInTheDocument();
      expect(screen.queryByText("Suggestions")).not.toBeInTheDocument();
    };

    assertSingleColumn();

    for (const pathname of ["/films", "/film/parasite", "/lists", "/person/bong-joon-ho"]) {
      mocks.pathname = pathname;
      rerender(
        <ShellGrid>
          <div>Focused page</div>
        </ShellGrid>
      );
      assertSingleColumn();
    }

    expect(container.firstElementChild).toHaveStyle({
      "--focused-navigation-content-max-width": "1240px",
    });
  });

  it("keeps a small inert left track to center focused navigation home feed", () => {
    flags.focusedNavigationEnabled = true;

    const { container } = render(
      <ShellGrid>
        <div>Focused home</div>
      </ShellGrid>
    );

    const grid = screen.getByText("Focused home").parentElement?.parentElement;
    expect(grid).toHaveClass(
      "xl:grid-cols-[var(--focused-home-left-spacer-width)_640px_minmax(0,1fr)]"
    );
    expect(grid).toHaveClass("xl:gap-x-[var(--home-sidebar-gap,2rem)]");
    expect(grid).not.toHaveClass(
      "xl:grid-cols-[minmax(0,1fr)_640px_minmax(0,1fr)]"
    );
    expect(grid?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
    expect(container.firstElementChild).toHaveStyle({
      "--focused-home-left-spacer-width":
        "max(0px, calc(50vw - 15.5rem - 20rem - 3rem))",
    });
    expect(container.firstElementChild).toHaveStyle({ "--home-sidebar-gap": "3rem" });
  });

  it("centers post detail in full desktop viewport with focused navigation", () => {
    flags.focusedNavigationEnabled = true;
    mocks.pathname = "/maya/post/post-1";

    render(
      <ShellGrid>
        <div>Post detail</div>
      </ShellGrid>
    );

    expect(screen.getByRole("main")).toHaveClass(
      "md:max-w-[var(--shell-main-max-width,640px)]",
      "md:mx-auto",
      "min-[1136px]:relative",
      "min-[1136px]:left-[calc(var(--focused-navigation-width)/-2)]"
    );
  });

  it("centers notifications in full desktop viewport with focused navigation", () => {
    flags.focusedNavigationEnabled = true;
    mocks.pathname = "/notifications";

    render(
      <ShellGrid>
        <div>Notifications page</div>
      </ShellGrid>
    );

    expect(screen.getByRole("main")).toHaveClass(
      "md:max-w-[var(--shell-main-max-width,640px)]",
      "md:mx-auto",
      "min-[1136px]:relative",
      "min-[1136px]:left-[calc(var(--focused-navigation-width)/-2)]"
    );
  });

  it("renders list detail pages across two home rail columns", () => {
    mocks.pathname = "/list/list-1";

    render(
      <ShellGrid>
        <div>List detail</div>
      </ShellGrid>
    );

    expect(screen.getByTestId("profile-completion-rail")).toHaveAttribute("data-layout", "home");
    expect(screen.queryByText("Suggestions")).not.toBeInTheDocument();
    expect(screen.getByText("List detail").parentElement?.parentElement).toHaveClass(
      "xl:grid-cols-[minmax(0,1fr)_640px_var(--home-right-rail-width)_minmax(0,1fr)]"
    );
    expect(screen.getByText("List detail").parentElement).toHaveClass(
      "xl:col-start-2",
      "xl:col-span-2",
      "xl:max-w-none"
    );
    expect(screen.getByText("List detail").parentElement).not.toHaveClass(
      "xl:w-[var(--home-explore-center-column-width)]"
    );
  });

  it("keeps the reposts tab in the wide profile shell", () => {
    mocks.pathname = "/teju/reposts";

    render(
      <ShellGrid>
        <div>Reposts</div>
      </ShellGrid>
    );

    expect(screen.getByRole("main")).toHaveClass("w-full", "max-w-none", "mx-0");
    expect(screen.getByRole("main")).not.toHaveClass(
      "md:max-w-[var(--shell-main-max-width,640px)]"
    );
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "data-compact-profile-username",
      "teju"
    );
  });
});
