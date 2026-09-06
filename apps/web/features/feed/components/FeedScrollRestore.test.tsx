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
  beforeEach(function () {
    navigation.pathname = "/";
    sessionStorage.clear();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      function (callback) {
        callback(0);
        return 1;
      }
    );
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(function () {});
    vi.spyOn(window, "scrollTo").mockImplementation(function () {});
  });

  afterEach(function () {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("starts each different route at the top", function () {
    const view = render(<ScrollRestore />);

    expect(window.scrollTo).not.toHaveBeenCalled();

    act(function () {
      navigation.pathname = "/discover";
      view.rerender(<ScrollRestore />);
    });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
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

  it("preserves scroll across tabs belonging to the same profile page", function () {
    navigation.pathname = "/maya";
    const view = render(<ScrollRestore />);

    act(function () {
      navigation.pathname = "/maya/diary";
      view.rerender(<ScrollRestore />);
    });

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
