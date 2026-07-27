import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileBody } from "./ProfileBody";

const navigation = vi.hoisted(function () {
  return { pathname: "/cinemafan/reposts" };
});
const layoutOrder = vi.hoisted(function () {
  return [] as string[];
});

vi.mock("next/navigation", function () {
  return {
    usePathname: function () {
      return navigation.pathname;
    },
  };
});

vi.mock("./ProfileDetails", function () {
  return {
    ProfileDetails: function () {
      return <div>Profile details</div>;
    },
  };
});

vi.mock("./ProfileTabs", function () {
  return {
    ProfileTabs: function (props: {
      activeTab?: string;
      onTabNavigation?: (tab: "posts") => void;
      onStickyNavigation?: (scrollY: number) => void;
    }) {
      return (
        <button
          type="button"
          onClick={function () {
            props.onStickyNavigation?.(420);
            props.onTabNavigation?.("posts");
          }}
        >
          Profile tabs: {props.activeTab}
        </button>
      );
    },
  };
});

vi.mock("./ProfileTabContent", async function () {
  var React = await import("react");
  return {
    ProfileTabContent: function (props: { tab: string }) {
      React.useLayoutEffect(function () {
        layoutOrder.push("content-layout");
      });
      return <div data-testid="profile-tab-content">Profile tab content: {props.tab}</div>;
    },
  };
});

describe("ProfileBody", function () {
  afterEach(function () {
    vi.restoreAllMocks();
    navigation.pathname = "/cinemafan/reposts";
    layoutOrder.length = 0;
  });

  it("keeps every tab content surface tall enough to preserve sticky tab position", function () {
    render(
      <ProfileBody
        username="cinemafan"
        displayName="Cinema Fan"
        bio=""
        location=""
        website=""
        followerCount={0}
        followingCount={0}
        filmsLoggedCount={0}
      />
    );

    expect(screen.getByTestId("profile-tab-content").parentElement).toHaveClass(
      "min-h-[calc(100dvh-var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))-3.25rem)]",
      "[overflow-anchor:none]",
      "md:min-h-[calc(100dvh-var(--site-header-sticky-offset,4.5rem)-3.25rem)]"
    );
  });

  it("restores sticky scroll from the parent after tab content commits", function () {
    var scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(function () {
      layoutOrder.push("scroll-restore");
    });
    Object.defineProperty(window, "scrollX", {
      configurable: true,
      writable: true,
      value: 0,
    });

    var view = render(
      <ProfileBody
        username="cinemafan"
        displayName="Cinema Fan"
        bio=""
        location=""
        website=""
        followerCount={0}
        followingCount={0}
        filmsLoggedCount={0}
      />
    );
    layoutOrder.length = 0;

    fireEvent.click(screen.getByRole("button", { name: "Profile tabs: reposts" }));

    expect(screen.getByTestId("profile-tab-content")).toHaveTextContent(
      "Profile tab content: posts"
    );
    expect(scrollTo).toHaveBeenCalledWith({
      top: 420,
      left: 0,
      behavior: "auto",
    });
    expect(layoutOrder).toEqual(["content-layout", "scroll-restore"]);

    navigation.pathname = "/cinemafan";
    view.rerender(
      <ProfileBody
        username="cinemafan"
        displayName="Cinema Fan"
        bio=""
        location=""
        website=""
        followerCount={0}
        followingCount={0}
        filmsLoggedCount={0}
      />
    );

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});
