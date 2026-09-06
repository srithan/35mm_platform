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
