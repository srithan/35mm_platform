import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShellGrid } from "./ShellGrid";

const mocks = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock("@/components/layout/SiteHeader", () => ({
  SiteHeader: () => <div>Desktop header</div>,
}));

vi.mock("@/components/layout/MobileHeader", () => ({
  MobileHeader: ({ onProfileClick }: { onProfileClick?: () => void }) => (
    <button type="button" onClick={onProfileClick}>
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

vi.mock("@/features/feed/components/HomeSuggestionsSidebar", () => ({
  HomeSuggestionsSidebar: () => <div>Suggestions</div>,
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
  });
});
