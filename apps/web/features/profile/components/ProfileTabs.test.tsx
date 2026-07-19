import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("keeps mobile labels collapsed except for the active tab", function () {
    render(<ProfileTabs username="CinemaFan" />);

    var posts = screen.getByRole("link", { name: "Posts" });
    var diary = screen.getByRole("link", { name: "Diary" });

    expect(posts).toHaveAttribute("aria-current", "page");
    expect(mobileLabel(posts)).toHaveClass("max-w-[7.5rem]", "opacity-100");
    expect(diary).not.toHaveAttribute("aria-current");
    expect(mobileLabel(diary)).toHaveClass("max-w-0", "opacity-0");
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
});
