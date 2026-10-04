import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { FocusedNavigationSidebar } from "./FocusedNavigationSidebar";

vi.mock("next/navigation", function () {
  return {
    usePathname: function () {
      return "/";
    },
    useRouter: function () {
      return { push: vi.fn() };
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
    useClerk: function () {
      return { signOut: vi.fn() };
    },
    useUser: function () {
      return { user: null, isLoaded: true, isSignedIn: false };
    },
  };
});

vi.mock("@/components/Logo", function () {
  return {
    BrandLogo: function MockBrandLogo() {
      return <span aria-label="35mm home" />;
    },
  };
});

vi.mock("@/components/SearchBar", function () {
  return {
    GlobalSearchBar: function MockGlobalSearchBar() {
      return <input type="search" aria-label="Search 35mm" />;
    },
  };
});

vi.mock("@/components/ConfirmDialog/ConfirmDialog", function () {
  return { ConfirmDialog: function MockConfirmDialog() { return null; } };
});

vi.mock("@/components/layout/SiteHeader/components/ProfileMenu/ProfileMenu", function () {
  return { ProfileMenu: function MockProfileMenu() { return null; } };
});

vi.mock("@/components/layout/SiteHeader/hooks/useSiteHeaderDropdowns", function () {
  return {
    useSiteHeaderDropdowns: function () {
      return {
        profileMenuOpen: false,
        profileWrapRef: { current: null },
        toggleProfileMenu: vi.fn(),
        closeProfileMenu: vi.fn(),
      };
    },
  };
});

vi.mock("@/components/layout/PostComposerModalContext", function () {
  return { useComposerModal: function () { return { openComposerModal: vi.fn() }; } };
});

vi.mock("@/features/auth/components/AuthPromptProvider", function () {
  return { useAuthPrompt: function () { return { promptLogin: vi.fn() }; } };
});

vi.mock("@/features/profile/hooks/useCurrentUserProfile", function () {
  return {
    initialForName: function () { return "P"; },
    useCurrentUserProfile: function () {
      return {
        data: null,
        isPending: false,
        isLoading: false,
        isFetching: false,
        fetchStatus: "idle",
      };
    },
  };
});

vi.mock("@/lib/config/uiFlags", function () {
  return { FOCUSED_NAVIGATION_ALIGNMENT: "top" };
});

describe("FocusedNavigationSidebar", function () {
  it("places global search inside focused desktop navigation", function () {
    render(<FocusedNavigationSidebar />);

    const sidebar = screen.getByRole("complementary", { name: "Primary navigation" });
    const search = within(sidebar).getByRole("searchbox", { name: "Search 35mm" });
    const navigation = within(sidebar).getByRole("navigation", { name: "Main navigation" });

    expect(search.compareDocumentPosition(navigation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
