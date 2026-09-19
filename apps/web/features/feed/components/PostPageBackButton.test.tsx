import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FROM_HISTORY_LENGTH_KEY,
  FROM_PATH_KEY,
  PostPageBackButton,
  RESTORE_FLAG_KEY,
} from "./PostPageBackButton";
import { ROUTES } from "@/lib/constants/routes";

const router = vi.hoisted(function () {
  return {
    back: vi.fn(),
    push: vi.fn(),
  };
});

vi.mock("next/navigation", function () {
  return {
    useRouter: function () {
      return router;
    },
  };
});

describe("PostPageBackButton", function () {
  beforeEach(function () {
    sessionStorage.clear();
    router.back.mockClear();
    router.push.mockClear();
  });

  afterEach(function () {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("uses browser history when post was opened from the feed", function () {
    vi.spyOn(window.history, "length", "get").mockReturnValue(12);
    sessionStorage.setItem(FROM_PATH_KEY, ROUTES.HOME);
    sessionStorage.setItem(FROM_HISTORY_LENGTH_KEY, "11");

    render(<PostPageBackButton />);
    fireEvent.click(screen.getByRole("button", { name: "Back to feed" }));

    expect(sessionStorage.getItem(RESTORE_FLAG_KEY)).toBe("1");
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("falls back to the saved path when history does not match feed navigation", function () {
    vi.spyOn(window.history, "length", "get").mockReturnValue(20);
    sessionStorage.setItem(FROM_PATH_KEY, "/discover");
    sessionStorage.setItem(FROM_HISTORY_LENGTH_KEY, "11");

    render(<PostPageBackButton />);
    fireEvent.click(screen.getByRole("button", { name: "Back to feed" }));

    expect(router.back).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/discover", { scroll: false });
  });
});
