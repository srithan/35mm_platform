import { afterEach, expect, it, vi } from "vitest";
import { restorePostScroll } from "./restorePostScroll";

afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });

it("restores synchronously without scheduling a later correction", () => {
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const frame = vi.spyOn(window, "requestAnimationFrame");
  const timeout = vi.spyOn(window, "setTimeout");
  restorePostScroll(924, null);
  expect(scroll).toHaveBeenCalledExactlyOnceWith(0, 924);
  expect(frame).not.toHaveBeenCalled();
  expect(timeout).not.toHaveBeenCalled();
});

it("uses the already-sized post offset", () => {
  const post = document.createElement("article");
  post.dataset.postScrollAnchor = "post-1";
  document.body.append(post);
  vi.spyOn(post, "getBoundingClientRect").mockReturnValue({ top: 172 } as DOMRect);
  vi.spyOn(window, "scrollY", "get").mockReturnValue(800);
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  restorePostScroll(800, JSON.stringify({ id: "post-1", top: 140 }));
  expect(scroll).toHaveBeenCalledExactlyOnceWith(0, 832);
});

it("falls back to absolute position for malformed data", () => {
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  restorePostScroll(924, "invalid json");
  expect(scroll).toHaveBeenCalledExactlyOnceWith(0, 924);
});

it("waits for a delayed feed commit and restores only once", async () => {
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const stop = restorePostScroll(924, JSON.stringify({ id: "delayed", top: 140 }));
  expect(scroll).not.toHaveBeenCalled();
  const post = document.createElement("article");
  post.dataset.postScrollAnchor = "delayed";
  vi.spyOn(post, "getBoundingClientRect").mockReturnValue({ top: 1064 } as DOMRect);
  document.body.append(post);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(scroll).toHaveBeenCalledExactlyOnceWith(0, 924);
  document.body.append(document.createElement("div"));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(scroll).toHaveBeenCalledTimes(1);
  stop?.();
});
