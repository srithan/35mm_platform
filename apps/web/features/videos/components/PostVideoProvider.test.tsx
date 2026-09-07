// @vitest-environment jsdom
import { StrictMode, useLayoutEffect } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PostVideoProvider, PostVideoSlot, useRetainPostVideo } from "./PostVideoProvider";

const state = vi.hoisted(() => ({ path: "/", mounts: 0, unmounts: 0 }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "viewer" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => state.path }));
vi.mock("./BunnyVideoPlayer", () => ({ BunnyVideoPlayer: () => {
  useLayoutEffect(() => { state.mounts++; return () => { state.unmounts++; }; }, []);
  return <iframe title="Video" src="about:blank" data-video-aspect-ratio="2" />;
} }));
vi.mock("./FeedVideoPlayer", () => ({ FeedVideoPlayer: () => <video data-testid="native" /> }));

beforeEach(() => {
  state.path = "/"; state.mounts = 0; state.unmounts = 0;
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
function Route({ show = true, native = false }: { show?: boolean; native?: boolean }) {
  const retain = useRetainPostVideo();
  return <><button onClick={() => retain?.("post")}>Open detail</button>
    {show && <PostVideoSlot postId="post" assetId={native ? undefined : "asset"} src={native ? "/video.mp4" : undefined} />}</>;
}

it("keeps the exact iframe and browsing context across a loading route and detail mount", async () => {
  const tree = (show: boolean) => <StrictMode><PostVideoProvider><Route key={state.path} show={show} /></PostVideoProvider></StrictMode>;
  const view = render(tree(true));
  const iframe = screen.getByTitle("Video") as HTMLIFrameElement;
  const window = iframe.contentWindow;
  const mounts = state.mounts;
  const unmounts = state.unmounts;
  fireEvent.click(screen.getByText("Open detail"));
  state.path = "/author/post/post";
  view.rerender(tree(false));
  await act(async () => {});
  expect(iframe.isConnected).toBe(true);
  view.rerender(tree(true));
  expect(screen.getByTitle("Video")).toBe(iframe);
  expect(iframe.contentWindow).toBe(window);
  expect(state.mounts).toBe(mounts);
  expect(state.unmounts).toBe(unmounts);
});

it("keeps native video playback position through navigation", () => {
  const tree = () => <PostVideoProvider><Route key={state.path} native /></PostVideoProvider>;
  const view = render(tree());
  const video = screen.getByTestId("native") as HTMLVideoElement;
  video.currentTime = 17;
  fireEvent.click(screen.getByText("Open detail"));
  state.path = "/author/post/post";
  view.rerender(tree());
  expect(screen.getByTestId("native")).toBe(video);
  expect(video.currentTime).toBe(17);
});

it("keeps portaled video below shell dropdown layers", () => {
  render(<PostVideoProvider><Route /></PostVideoProvider>);
  const surface = document.querySelector("[data-post-video='post']") as HTMLElement | null;
  expect(surface?.style.zIndex).toBe("var(--z-post-video)");
});

function mockRect(box: { top: number; left: number; width: number; height: number }): DOMRect {
  return {
    x: box.left,
    y: box.top,
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
    right: box.left + box.width,
    bottom: box.top + box.height,
    toJSON: function () {
      return {};
    },
  } as DOMRect;
}

it("clips portaled video below sticky page chrome in the same column", () => {
  const nav = document.createElement("nav");
  nav.id = "site-nav";
  document.body.appendChild(nav);
  const chrome = document.createElement("nav");
  chrome.setAttribute("data-sticky-chrome", "");
  document.body.appendChild(chrome);

  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.id === "site-nav") return mockRect({ top: 0, left: 0, width: 1200, height: 72 });
    if (this.getAttribute("data-sticky-chrome") !== null) {
      return mockRect({ top: 72, left: 0, width: 640, height: 52 });
    }
    if (this.hasAttribute("data-post-video") || this.hasAttribute("data-post-video-slot")) {
      return mockRect({ top: 80, left: 0, width: 600, height: 200 });
    }
    return mockRect({ top: 0, left: 0, width: 0, height: 0 });
  });

  render(<PostVideoProvider><Route /></PostVideoProvider>);
  const surface = document.querySelector("[data-post-video='post']") as HTMLElement | null;
  expect(surface?.style.clipPath).toBe("inset(44px 0 0)");
  nav.remove();
  chrome.remove();
});

it("ignores sticky chrome in a different column when clipping portaled video", () => {
  const nav = document.createElement("nav");
  nav.id = "site-nav";
  document.body.appendChild(nav);
  const chrome = document.createElement("nav");
  chrome.setAttribute("data-sticky-chrome", "");
  document.body.appendChild(chrome);

  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.id === "site-nav") return mockRect({ top: 0, left: 0, width: 1200, height: 72 });
    if (this.getAttribute("data-sticky-chrome") !== null) {
      return mockRect({ top: 72, left: 800, width: 240, height: 400 });
    }
    if (this.hasAttribute("data-post-video") || this.hasAttribute("data-post-video-slot")) {
      return mockRect({ top: 40, left: 0, width: 600, height: 200 });
    }
    return mockRect({ top: 0, left: 0, width: 0, height: 0 });
  });

  render(<PostVideoProvider><Route /></PostVideoProvider>);
  const surface = document.querySelector("[data-post-video='post']") as HTMLElement | null;
  expect(surface?.style.clipPath).toBe("inset(32px 0 0)");
  nav.remove();
  chrome.remove();
});

it("disposes players on unrelated navigation instead of leaving audio running", async () => {
  const view = render(<PostVideoProvider><Route /></PostVideoProvider>);
  state.path = "/settings";
  view.rerender(<PostVideoProvider><Route show={false} /></PostVideoProvider>);
  await act(async () => {});
  expect(screen.queryByTitle("Video")).toBeNull();
});

it("bounds retention if the destination never mounts", async () => {
  vi.useFakeTimers();
  const view = render(<PostVideoProvider><Route /></PostVideoProvider>);
  fireEvent.click(screen.getByText("Open detail"));
  view.rerender(<PostVideoProvider><Route show={false} /></PostVideoProvider>);
  await act(async () => {});
  await act(async () => { vi.advanceTimersByTime(10_001); });
  expect(screen.queryByTitle("Video")).toBeNull();
});

it("clears retention when detail attaches so leaving detail disposes immediately", async () => {
  const tree = (show = true) => <PostVideoProvider><Route key={state.path} show={show} /></PostVideoProvider>;
  const view = render(tree());
  fireEvent.click(screen.getByText("Open detail"));
  state.path = "/author/post/post";
  view.rerender(tree());
  state.path = "/settings";
  view.rerender(tree(false));
  await act(async () => {});
  expect(screen.queryByTitle("Video")).toBeNull();
});

it("cancels retention when navigation changes to a different destination", async () => {
  const view = render(<PostVideoProvider><Route /></PostVideoProvider>);
  fireEvent.click(screen.getByText("Open detail"));
  state.path = "/settings";
  view.rerender(<PostVideoProvider><Route show={false} /></PostVideoProvider>);
  await act(async () => {});
  expect(screen.queryByTitle("Video")).toBeNull();
});

it("reserves cached video geometry before subsequent layout effects on return", async () => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 600, height: 300, top: 0, left: 0 } as DOMRect);
  let reserved = "";
  function CheckLayout() {
    useLayoutEffect(() => {
      reserved = (document.querySelector("[data-post-video-slot]") as HTMLElement | null)?.style.height ?? "";
    });
    return null;
  }
  const tree = (show: boolean) => <PostVideoProvider><Route key={state.path} show={show} /><CheckLayout /></PostVideoProvider>;
  const view = render(tree(true));
  state.path = "/settings";
  view.rerender(tree(false));
  await act(async () => {});
  expect(screen.queryByTitle("Video")).toBeNull();
  state.path = "/";
  view.rerender(tree(true));
  expect(reserved).toBe("300px");
});
