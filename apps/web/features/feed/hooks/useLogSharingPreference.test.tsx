import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLogSharingPreference } from "./useLogSharingPreference";

const mocks = vi.hoisted(function () {
  return { showGlobalFlashToast: vi.fn() };
});

vi.mock("@/components/FlashToast", function () {
  return { showGlobalFlashToast: mocks.showGlobalFlashToast };
});

beforeEach(function () {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
    clear: vi.fn(() => values.clear()),
    key: vi.fn((index: number) => [...values.keys()][index] ?? null),
    get length() { return values.size; },
  } satisfies Storage);
  mocks.showGlobalFlashToast.mockReset();
});

afterEach(function () {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useLogSharingPreference feed sharing", function () {
  it.each([null, "profile", "private", "", "true", "PUBLIC", "invalid"])(
    "skips feed unless the saved preference explicitly shares: %s",
    function (stored) {
      if (stored !== null) window.localStorage.setItem("35mm.log-sharing.v1.alice", stored);

      const { result } = renderHook(() => useLogSharingPreference("alice"));

      expect(result.current.postToFeed).toBe(false);
      expect(result.current.sharingNotice).toBeNull();
    }
  );

  it("loads public only for the account that saved it and never leaks it during an account switch", function () {
    window.localStorage.setItem("35mm.log-sharing.v1.alice", "feed");
    const observed: Array<{ userId: string | null; share: boolean }> = [];
    const { result, rerender } = renderHook(({ userId }: { userId: string | null }) => {
      const preference = useLogSharingPreference(userId);
      observed.push({ userId, share: preference.postToFeed });
      return preference;
    }, { initialProps: { userId: "alice" as string | null } });

    expect(result.current.postToFeed).toBe(true);

    rerender({ userId: "bob" });
    expect(result.current.postToFeed).toBe(false);
    expect(observed.filter((entry) => entry.userId === "bob").every((entry) => !entry.share)).toBe(true);

    act(() => result.current.rememberSharing(false));
    expect(window.localStorage.getItem("35mm.log-sharing.v1.bob")).toBe("profile");
    expect(window.localStorage.getItem("35mm.log-sharing.v1.alice")).toBe("feed");

    rerender({ userId: null });
    expect(result.current.postToFeed).toBe(false);
    expect(observed.filter((entry) => entry.userId === null).every((entry) => !entry.share)).toBe(true);

    rerender({ userId: "alice" });
    expect(result.current.postToFeed).toBe(true);
  });

  it("keeps unsaved audience changes out of storage and persists only after rememberSharing", function () {
    const setItem = vi.mocked(window.localStorage.setItem);
    const first = renderHook(() => useLogSharingPreference("alice"));

    act(() => first.result.current.setPostToFeed(true));
    expect(first.result.current.postToFeed).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
    first.unmount();

    const second = renderHook(() => useLogSharingPreference("alice"));
    expect(second.result.current.postToFeed).toBe(false);
    act(() => second.result.current.setPostToFeed(true));
    expect(setItem).not.toHaveBeenCalled();

    act(() => second.result.current.rememberSharing(true));
    expect(setItem).toHaveBeenCalledExactlyOnceWith("35mm.log-sharing.v1.alice", "feed");
    second.unmount();

    const third = renderHook(() => useLogSharingPreference("alice"));
    expect(third.result.current.postToFeed).toBe(true);
  });

  it.each([null, undefined])("does not persist an anonymous preference for user %s", function (userId) {
    const setItem = vi.mocked(window.localStorage.setItem);
    const { result } = renderHook(() => useLogSharingPreference(userId));

    expect(result.current.postToFeed).toBe(false);
    act(() => result.current.rememberSharing(true));
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe("useLogSharingPreference storage failures", function () {
  it("falls back to profile-only and reports a blocked preference read", function () {
    const error = new Error("Storage access denied");
    vi.mocked(window.localStorage.getItem).mockImplementation(() => { throw error; });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { result } = renderHook(() => useLogSharingPreference("alice"));

    expect(result.current.postToFeed).toBe(false);
    expect(result.current.sharingNotice).toBe(
      "This browser could not load your sharing preference. This entry will skip follower feeds."
    );
    expect(warn).toHaveBeenCalledWith("[log-sharing] Could not read composer preference", { error });
    expect(mocks.showGlobalFlashToast).not.toHaveBeenCalled();

    act(() => result.current.setPostToFeed(true));
    expect(result.current.postToFeed).toBe(true);
  });

  it("reports a failed preference write without throwing or undoing the saved entry's feed choice", function () {
    window.localStorage.setItem("35mm.log-sharing.v1.alice", "profile");
    const error = new Error("Storage quota exceeded");
    vi.mocked(window.localStorage.setItem).mockImplementation(() => { throw error; });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() => useLogSharingPreference("alice"));
    act(() => result.current.setPostToFeed(true));

    expect(() => act(() => result.current.rememberSharing(true))).not.toThrow();

    expect(result.current.postToFeed).toBe(true);
    expect(window.localStorage.getItem("35mm.log-sharing.v1.alice")).toBe("profile");
    expect(warn).toHaveBeenCalledWith("[log-sharing] Could not save composer preference", { error });
    expect(mocks.showGlobalFlashToast).toHaveBeenCalledWith(
      "Entry saved. This browser could not remember your sharing preference.",
      "error"
    );
  });
});
