import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMobileBottomChromeStore } from "@/stores/useMobileBottomChromeStore";
import { MobileHeader } from "./MobileHeader";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: null }),
}));

vi.mock("@/components/Avatar", () => ({
  Avatar: () => <span data-testid="avatar" />,
}));

vi.mock("@/features/profile/hooks/useCurrentUserProfile", () => ({
  initialForName: () => "P",
  useCurrentUserProfile: () => ({
    data: null,
    fetchStatus: "idle",
    isFetching: false,
    isLoading: false,
    isPending: false,
  }),
}));

vi.mock("@/lib/utils/syncSiteHeaderStickyOffset", () => ({
  syncSiteHeaderStickyOffset: vi.fn(),
}));

describe("MobileHeader scroll visibility", () => {
  beforeEach(() => {
    useMobileBottomChromeStore.setState({ navVisible: true });
  });

  it("hides with mobile chrome and returns when scrolling up", () => {
    render(<MobileHeader />);
    const header = screen.getByRole("banner");

    expect(header).toHaveClass("translate-y-0", "opacity-100");
    expect(header.inert).toBe(false);

    act(function () {
      useMobileBottomChromeStore.getState().setNavVisible(false);
    });

    expect(header).toHaveClass("-translate-y-full", "opacity-0", "pointer-events-none");
    expect(header.inert).toBe(true);

    act(function () {
      useMobileBottomChromeStore.getState().setNavVisible(true);
    });

    expect(header).toHaveClass("translate-y-0", "opacity-100");
    expect(header.inert).toBe(false);
  });

  it("stays visible while sidebar is open", () => {
    useMobileBottomChromeStore.setState({ navVisible: false });

    render(<MobileHeader sidebarOpen />);

    expect(screen.getByRole("banner")).toHaveClass(
      "translate-x-[var(--mobile-sidebar-width)]",
      "translate-y-0",
      "opacity-100"
    );
  });

  it("links to chat after search", () => {
    render(<MobileHeader />);

    const searchLink = screen.getByRole("link", { name: "Search" });
    const chatLink = screen.getByRole("link", { name: "Chat" });

    expect(searchLink).toHaveAttribute("href", "/discover");
    expect(chatLink).toHaveAttribute("href", "/chat");
    expect(searchLink.compareDocumentPosition(chatLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
