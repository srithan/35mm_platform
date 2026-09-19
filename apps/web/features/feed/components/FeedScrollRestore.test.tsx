import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FROM_PATH_KEY,
  RESTORE_FLAG_KEY,
  SCROLL_KEY,
} from "./PostPageBackButton";
import { ScrollRestore } from "./FeedScrollRestore";

const navigation = vi.hoisted(function () {
  return { pathname: "/" };
});

vi.mock("next/navigation", function () {
  return {
    usePathname: function () {
      return navigation.pathname;
    },
  };
});

describe("ScrollRestore", function () {
  let scrollY = 0;

  beforeEach(function () {
    navigation.pathname = "/";
    scrollY = 0;
    sessionStorage.clear();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      function (callback) {
        callback(0);
        return 1;
      }
    );
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(function () {});
    vi.spyOn(window, "scrollY", "get").mockImplementation(function () {
      return scrollY;
    });
    vi.spyOn(window, "scrollTo").mockImplementation(function (_x, y) {
      scrollY = typeof y === "number" ? y : 0;
    });
  });

  afterEach(function () {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("starts each unvisited route at the top", function () {
    const view = render(<ScrollRestore />);

    expect(window.scrollTo).not.toHaveBeenCalled();

    act(function () {
      navigation.pathname = "/discover";
      view.rerender(<ScrollRestore />);
    });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("restores each route's own saved position", function () {
    const view = render(<ScrollRestore />);
    scrollY = 1480;
    window.dispatchEvent(new Event("scroll"));

    act(function () {
      navigation.pathname = "/discover";
      view.rerender(<ScrollRestore />);
    });

    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);

    scrollY = 360;
    window.dispatchEvent(new Event("scroll"));

    act(function () {
      navigation.pathname = "/";
      view.rerender(<ScrollRestore />);
    });

    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 1480);

    act(function () {
      navigation.pathname = "/discover";
      view.rerender(<ScrollRestore />);
    });

    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 360);
  });

  it("restores the saved feed position when returning from post detail", function () {
    navigation.pathname = "/maya/post/post-1";
    const view = render(<ScrollRestore />);
    sessionStorage.setItem(RESTORE_FLAG_KEY, "1");
    sessionStorage.setItem(SCROLL_KEY, "1840");
    sessionStorage.setItem(FROM_PATH_KEY, "/");

    act(function () {
      navigation.pathname = "/";
      view.rerender(<ScrollRestore />);
    });

    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 1840);
    expect(sessionStorage.getItem(RESTORE_FLAG_KEY)).toBeNull();
    expect(sessionStorage.getItem(SCROLL_KEY)).toBeNull();
    expect(sessionStorage.getItem(FROM_PATH_KEY)).toBeNull();
  });

  it("restores the feed when browser back returns from post detail", function () {
    navigation.pathname = "/maya/post/post-1";
    const view = render(<ScrollRestore />);
    sessionStorage.setItem(SCROLL_KEY, "920");
    sessionStorage.setItem(FROM_PATH_KEY, "/");

    act(function () {
      navigation.pathname = "/";
      view.rerender(<ScrollRestore />);
    });

    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 920);
    expect(sessionStorage.getItem(SCROLL_KEY)).toBeNull();
    expect(sessionStorage.getItem(FROM_PATH_KEY)).toBeNull();
  });

  it("does not apply a saved position to a different route", function () {
    navigation.pathname = "/maya/post/post-1";
    const view = render(<ScrollRestore />);
    sessionStorage.setItem(RESTORE_FLAG_KEY, "1");
    sessionStorage.setItem(SCROLL_KEY, "1840");
    sessionStorage.setItem(FROM_PATH_KEY, "/");

    act(function () {
      navigation.pathname = "/discover";
      view.rerender(<ScrollRestore />);
    });

    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(sessionStorage.getItem(RESTORE_FLAG_KEY)).toBeNull();
    expect(sessionStorage.getItem(SCROLL_KEY)).toBeNull();
    expect(sessionStorage.getItem(FROM_PATH_KEY)).toBeNull();
  });

  it("keeps profile tab scroll positions independent", function () {
    navigation.pathname = "/maya";
    const view = render(<ScrollRestore />);
    scrollY = 680;
    window.dispatchEvent(new Event("scroll"));

    act(function () {
      navigation.pathname = "/maya/diary";
      view.rerender(<ScrollRestore />);
    });

    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);

    scrollY = 1120;
    window.dispatchEvent(new Event("scroll"));

    act(function () {
      navigation.pathname = "/maya";
      view.rerender(<ScrollRestore />);
    });

    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 680);
  });
});
