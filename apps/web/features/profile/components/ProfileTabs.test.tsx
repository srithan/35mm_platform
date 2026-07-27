import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileTabs } from "./ProfileTabs";

const navigation = vi.hoisted(function () {
  return { pathname: "/cinemafan" };
});

vi.mock("next/navigation", function () {
  return {
    usePathname: function () {
      return navigation.pathname;
    },
  };
});

vi.mock("framer-motion", async function (importOriginal) {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    useReducedMotion: function () {
      return false;
    },
  };
});

function mobileLabel(link: HTMLElement): HTMLElement {
  var label = link.querySelector<HTMLElement>('span[aria-hidden="true"]');
  if (!label) throw new Error("Profile tab label not found");
  return label;
}

describe("ProfileTabs", function () {
  beforeEach(function () {
    navigation.pathname = "/cinemafan";
  });

  afterEach(function () {
    vi.restoreAllMocks();
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
    Object.defineProperty(window, "scrollX", {
      configurable: true,
      writable: true,
      value: 0,
    });
  });

  it("keeps mobile labels collapsed except for the active tab", function () {
    render(<ProfileTabs username="CinemaFan" />);

    var posts = screen.getByRole("link", { name: "Posts" });
    var diary = screen.getByRole("link", { name: "Diary" });

    expect(posts).toHaveAttribute("aria-current", "page");
    expect(mobileLabel(posts)).toHaveClass("max-w-[7.5rem]", "opacity-100");
    expect(diary).not.toHaveAttribute("aria-current");
    expect(mobileLabel(diary)).toHaveClass("max-w-0", "opacity-0");
  });

  it("insets the mobile tab strip and uses a calendar for Diary", function () {
    render(<ProfileTabs username="CinemaFan" />);

    var list = screen.getByRole("list");
    var diary = screen.getByRole("link", { name: "Diary" });

    expect(list.parentElement?.parentElement).toHaveClass("px-4", "md:px-0");
    expect(diary.querySelector(".lucide-calendar-days")).toBeInTheDocument();
  });

  it("hides inactive desktop icons and animates the active icon into place", function () {
    render(<ProfileTabs username="CinemaFan" />);

    var postsIcon = screen
      .getByRole("link", { name: "Posts" })
      .querySelector(".lucide-file-text");
    var diaryIcon = screen
      .getByRole("link", { name: "Diary" })
      .querySelector(".lucide-calendar-days");

    expect(postsIcon).toHaveClass(
      "md:mr-2",
      "md:w-[17px]",
      "md:rotate-0",
      "md:scale-100",
      "opacity-100"
    );
    expect(diaryIcon).toHaveClass(
      "md:mr-0",
      "md:w-0",
      "md:-rotate-6",
      "md:scale-75",
      "md:opacity-0"
    );
    expect(diaryIcon).toHaveClass(
      "transition-[width,margin,opacity,transform,color]",
      "motion-reduce:transition-none"
    );
  });

  it("keeps one persistent underline outside tab links", function () {
    render(<ProfileTabs username="CinemaFan" />);

    var indicator = screen.getByTestId("profile-tab-indicator");

    expect(screen.getAllByTestId("profile-tab-indicator")).toHaveLength(1);
    expect(indicator).toHaveClass("absolute", "bottom-0", "w-1/5");
    expect(screen.getByRole("link", { name: "Posts" })).not.toContainElement(indicator);
  });

  it("preserves window scroll when navigating from a sticky tab bar", function () {
    navigation.pathname = "/cinemafan/reposts";
    var onStickyNavigation = vi.fn();
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 420,
    });
    Object.defineProperty(window, "scrollX", {
      configurable: true,
      writable: true,
      value: 0,
    });

    render(
      <ProfileTabs
        username="CinemaFan"
        onStickyNavigation={onStickyNavigation}
      />
    );
    var nav = screen.getByRole("navigation", { name: "Profile sections" });
    nav.style.top = "72px";
    vi.spyOn(nav, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 72,
      top: 72,
      right: 640,
      bottom: 124,
      left: 0,
      width: 640,
      height: 52,
      toJSON: function () {
        return {};
      },
    });

    fireEvent.click(screen.getByRole("link", { name: "Posts" }));

    expect(onStickyNavigation).toHaveBeenCalledWith(420);
  });

  it("reports a plain tab click before the route pathname changes", function () {
    var onTabNavigation = vi.fn();
    render(
      <ProfileTabs
        username="CinemaFan"
        onTabNavigation={onTabNavigation}
      />
    );

    fireEvent.click(screen.getByRole("link", { name: "Stats" }));

    expect(onTabNavigation).toHaveBeenCalledWith("stats");
    expect(navigation.pathname).toBe("/cinemafan");
  });

  it("does not optimistically select tabs for modified clicks", function () {
    var onTabNavigation = vi.fn();
    render(
      <ProfileTabs
        username="CinemaFan"
        onTabNavigation={onTabNavigation}
      />
    );

    fireEvent.click(screen.getByRole("link", { name: "Stats" }), {
      metaKey: true,
    });

    expect(onTabNavigation).not.toHaveBeenCalled();
  });

  it("renders a controlled active tab while route navigation is pending", function () {
    render(<ProfileTabs username="CinemaFan" activeTab="stats" />);

    expect(screen.getByRole("link", { name: "Stats" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Posts" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("marks the route tab active while preserving canonical profile links", function () {
    navigation.pathname = "/cinemafan/lists";
    render(<ProfileTabs username="CinemaFan" />);

    expect(screen.getByRole("link", { name: "Posts" })).toHaveAttribute(
      "href",
      "/cinemafan"
    );
    expect(screen.getByRole("link", { name: "Lists" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(mobileLabel(screen.getByRole("link", { name: "Lists" }))).toHaveClass(
      "max-w-[7.5rem]",
      "opacity-100"
    );
  });

  it("links to the repost-only profile route and marks it active", function () {
    navigation.pathname = "/cinemafan/reposts";
    render(<ProfileTabs username="CinemaFan" />);

    var reposts = screen.getByRole("link", { name: "Reposts" });
    expect(reposts).toHaveAttribute("href", "/cinemafan/reposts");
    expect(reposts).toHaveAttribute("aria-current", "page");
    expect(mobileLabel(reposts)).toHaveClass("max-w-[7.5rem]", "opacity-100");
    expect(screen.getByRole("link", { name: "Posts" })).not.toHaveAttribute(
      "aria-current"
    );
  });
});
