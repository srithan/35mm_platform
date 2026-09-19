import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileTabBar } from "./MobileTabBar";
import { useMobileBottomChromeStore } from "@/stores/useMobileBottomChromeStore";

const mocks = vi.hoisted(function () {
  return {
    pathname: "/",
    traditionalTabBar: false,
  };
});

vi.mock("next/navigation", function () {
  return {
    usePathname: function () {
      return mocks.pathname;
    },
  };
});

vi.mock("next/link", function () {
  return {
    default: function MockLink({
      children,
      href,
      ...props
    }: {
      children: ReactNode;
      href: string;
    }) {
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
  };
});

vi.mock("@clerk/nextjs", function () {
  return {
    useAuth: function () {
      return {
        getToken: vi.fn(),
        isLoaded: true,
        isSignedIn: false,
      };
    },
    useUser: function () {
      return {
        user: null,
      };
    },
  };
});

vi.mock("@tanstack/react-query", function () {
  return {
    useQuery: function () {
      return {
        data: undefined,
      };
    },
  };
});

vi.mock("@/features/auth/components/AuthPromptProvider", function () {
  return {
    useAuthPrompt: function () {
      return {
        promptLogin: vi.fn(),
      };
    },
  };
});

vi.mock("@/features/profile/hooks/useCurrentUserProfile", function () {
  return {
    useCurrentUserProfile: function () {
      return {
        data: null,
      };
    },
  };
});

vi.mock("@/lib/config/uiFlags", function () {
  return {
    get TRADITIONAL_MOBILE_TAB_BAR_ENABLED() {
      return mocks.traditionalTabBar;
    },
  };
});

describe("MobileTabBar", function () {
  beforeEach(function () {
    mocks.pathname = "/";
    mocks.traditionalTabBar = false;
    useMobileBottomChromeStore.setState({ navVisible: true });
  });

  it("keeps the floating layout by default", function () {
    render(<MobileTabBar />);

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toHaveClass("bottom-[max(0.625rem,env(safe-area-inset-bottom,0px))]");
    expect(nav).toHaveClass("px-3");
    expect(nav.firstElementChild).toHaveClass("max-w-[480px]");
    expect(nav.firstElementChild).toHaveClass("rounded-full");
  });

  it("uses full-width square bottom placement when traditional flag is enabled", function () {
    mocks.traditionalTabBar = true;

    render(<MobileTabBar />);

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toHaveClass("bottom-0");
    expect(nav).toHaveClass("px-0");
    expect(nav.firstElementChild).toHaveClass("w-full");
    expect(nav.firstElementChild).toHaveClass("max-w-none");
    expect(nav.firstElementChild).toHaveClass("rounded-none");
    expect(nav.firstElementChild).toHaveClass("border-t");
  });

  it("preserves store-driven hide/show chrome behavior", function () {
    useMobileBottomChromeStore.setState({ navVisible: false });

    const { container } = render(<MobileTabBar />);

    const nav = container.querySelector("nav[aria-label='Main navigation']");
    expect(nav).not.toBeNull();
    expect(nav).toHaveAttribute("aria-hidden", "true");
    expect(nav).toHaveClass("translate-y-[calc(100%+1rem)]");
    expect(nav).toHaveClass("opacity-0");
  });
});
