// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useVideoSoundStore } from "@/stores/useVideoSoundStore";
import { FeedVideoPlayer } from "./FeedVideoPlayer";
import { fireEvent } from "@testing-library/react";
import { BunnyVideoPlayer } from "./BunnyVideoPlayer";

const state = vi.hoisted(() => ({ autoplay: true, startWithSound: false, quietMode: false, nearby: true, visible: true,
  playback: vi.fn(), getToken: vi.fn().mockResolvedValue("token") }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "viewer", isLoaded: true, getToken: state.getToken }) }));
vi.mock("@/features/settings/hooks/useSettings", () => ({ useSettingsQuery: () => ({ data: { appearance: { videoAutoplay: state.autoplay }, media: { startWithSound: state.startWithSound, quietMode: state.quietMode } } }) }));
vi.mock("../hooks/useVideoVisibility", () => ({ useVideoVisibility: () => ({ ref: { current: null }, nearby: state.nearby, visible: state.visible }) }));
vi.mock("../api/videoApi", () => ({ getVideoPlayback: state.playback }));

beforeEach(() => {
  useVideoSoundStore.setState({ muted: true, scope: null });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  state.quietMode = false; state.startWithSound = false; state.autoplay = true; state.nearby = true; state.visible = true;
  state.playback.mockReset().mockResolvedValue({ embedUrl: "https://iframe.mediadelivery.net/embed/1/video?token=signed&expires=1000", posterUrl: "https://test.b-cdn.net/video/thumbnail.jpg?token=signed", expires: 1000, width: 1080, height: 1920 });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = () => <QueryClientProvider client={client}><BunnyVideoPlayer assetId="asset" /></QueryClientProvider>;
  const view = render(tree());
  return { ...view, update: () => view.rerender(tree()) };
}
function ready(frame: HTMLIFrameElement, origin = "https://iframe.mediadelivery.net") {
  act(() => window.dispatchEvent(new MessageEvent("message", { origin, source: frame.contentWindow,
    data: JSON.stringify({ context: "player.js", event: "ready" }) })));
}
it("loads player without a click, preserves signature and uses source dimensions", async () => {
  setup();
  const frame = await screen.findByTitle("Video");
  const url = new URL(frame.getAttribute("src")!);
  expect(url.searchParams.get("token")).toBe("signed");
  expect(url.searchParams.get("responsive")).toBe("false");
  expect(frame.parentElement?.style.aspectRatio).toBe("1080 / 1920");
  expect(screen.getByRole("button", { name: "Play video" })).toBeVisible();
});
it("defers playback grants for distant posts", () => {
  state.nearby = false; setup();
  expect(state.playback).not.toHaveBeenCalled();
  expect(screen.queryByRole("status")).toBeNull();
});
it("autoplays muted, pauses offscreen, resumes without reloading, and reacts to preference", async () => {
  const view = setup();
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  const send = vi.spyOn(frame.contentWindow!, "postMessage");
  ready(frame, "https://untrusted.example");
  expect(send).not.toHaveBeenCalled();
  ready(frame);
  const methods = () => send.mock.calls.map(([data]) => JSON.parse(data as string).method).filter(method => !["addEventListener", "setVolume"].includes(method));
  expect(methods()).toEqual(["mute", "play", "mute"]);
  state.visible = false; view.update();
  expect(methods().at(-1)).toBe("pause");
  state.visible = true; view.update();
  expect(methods().slice(-3)).toEqual(["mute", "play", "mute"]);
  state.autoplay = false; view.update();
  expect(methods().at(-1)).toBe("pause");
  expect(screen.getByTitle("Video")).toBe(frame);
});
it("keeps controls ready with autoplay disabled", async () => {
  state.autoplay = false; setup();
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  const send = vi.spyOn(frame.contentWindow!, "postMessage");
  ready(frame);
  expect(send.mock.calls.map(([data]) => JSON.parse(data as string).method).filter(method => !["addEventListener", "setVolume"].includes(method))).toEqual(["mute", "pause"]);
});
it("surfaces denied playback and offers retry", async () => {
  state.playback.mockRejectedValue(new Error("Video unavailable")); setup();
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Video unavailable"));
  expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
});

it("reveals native controls on readiness even when autoplay makes no progress", async () => {
  setup();
  expect(screen.getByRole("status")).toHaveTextContent("Loading video…");
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  expect(frame.style.opacity).toBe("0");
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByLabelText("Video preview").querySelector("img")).toHaveAttribute("src", expect.stringContaining("thumbnail.jpg"));
  ready(frame, "https://untrusted.example");
  expect(frame.style.opacity).toBe("0");
  ready(frame);
  // A browser-blocked play request must never cover the paused native controls.
  expect(frame.style.opacity).toBe("1");
  expect(frame).toHaveAttribute("tabindex", "0");
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByLabelText("Video preview")).toBeNull();
});
it("reveals manual controls on provider error rather than trapping the preview", async () => {
  setup();
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  ready(frame);
  act(() => window.dispatchEvent(new MessageEvent("message", {
    origin: "https://iframe.mediadelivery.net", source: frame.contentWindow,
    data: JSON.stringify({ context: "player.js", event: "error" }),
  })));
  expect(frame.style.opacity).toBe("1");
});

it("shares native controls with mounted and newly mounted players, including mute again", async () => {
  const view = setup();
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  const send = vi.spyOn(frame.contentWindow!, "postMessage");
  ready(frame);
  const native = render(<><FeedVideoPlayer src="/one.mp4" /><FeedVideoPlayer src="/two.mp4" /></>);
  const [one, two] = native.container.querySelectorAll("video");
  act(() => { one!.muted = false; fireEvent.volumeChange(one!); });
  expect(two!.muted).toBe(false);
  expect(send.mock.calls.at(-1)?.[0]).toContain('"method":"unmute"');
  const later = render(<FeedVideoPlayer src="/three.mp4" />);
  expect(later.container.querySelector("video")!.muted).toBe(false);
  state.visible = false; view.update();
  state.visible = true; view.update();
  expect(send.mock.calls.map(([data]) => JSON.parse(data as string).method)).toContain("pause");
  expect(JSON.parse(send.mock.calls.at(-1)![0] as string).method).toBe("unmute");
  act(() => { two!.muted = true; fireEvent.volumeChange(two!); });
  expect(one!.muted).toBe(true);
  expect(later.container.querySelector("video")!.muted).toBe(true);
  expect(send.mock.calls.at(-1)?.[0]).toContain('"method":"mute"');
});

it("reads Bunny native mute changes, rejects spoofed/stale replies, and stops polling offscreen", async () => {
  const view = setup();
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  const send = vi.spyOn(frame.contentWindow!, "postMessage");
  vi.useFakeTimers();
  ready(frame);
  act(() => vi.advanceTimersByTime(500));
  const request = JSON.parse(send.mock.calls.at(-1)![0] as string);
  expect(request.method).toBe("getMuted");
  const reply = (origin: string, source: Window | null, listener = request.listener) => act(() => {
    window.dispatchEvent(new MessageEvent("message", { origin, source,
      data: { context: "player.js", event: "getMuted", listener, value: false } }));
  });
  reply("https://untrusted.example", frame.contentWindow);
  reply("https://iframe.mediadelivery.net", window);
  reply("https://iframe.mediadelivery.net", frame.contentWindow, "stale");
  expect(useVideoSoundStore.getState().muted).toBe(true);
  reply("https://iframe.mediadelivery.net", frame.contentWindow);
  expect(useVideoSoundStore.getState().muted).toBe(false);
  state.visible = false; view.update();
  send.mockClear();
  act(() => vi.advanceTimersByTime(2000));
  expect(send).not.toHaveBeenCalled();
});

it("initializes a new Bunny iframe with the current sound preference", async () => {
  useVideoSoundStore.setState({ muted: false, scope: JSON.stringify(["viewer", false, false]) });
  setup();
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  expect(new URL(frame.src).searchParams.get("muted")).toBe("false");
});


it("allows only one Bunny player and transfers ownership on manual play", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><BunnyVideoPlayer assetId="one" title="One" /><BunnyVideoPlayer assetId="two" title="Two" /></QueryClientProvider>);
  const one = await screen.findByTitle("One") as HTMLIFrameElement;
  const two = await screen.findByTitle("Two") as HTMLIFrameElement;
  const first = vi.spyOn(one.contentWindow!, "postMessage");
  const second = vi.spyOn(two.contentWindow!, "postMessage");
  ready(one); ready(two);
  expect(screen.queryByRole("status")).toBeNull();
  expect(two.parentElement?.querySelector('[role="status"]')).toBeNull();
  const methods = (send: typeof first) => send.mock.calls.map(([data]) => JSON.parse(data as string).method);
  expect(methods(first)).toContain("play");
  expect(methods(second)).not.toContain("play");
  act(() => window.dispatchEvent(new MessageEvent("message", {
    origin: "https://iframe.mediadelivery.net", source: two.contentWindow,
    data: { context: "player.js", event: "play" },
  })));
  expect(methods(first).at(-1)).toBe("pause");
});

it("native manual playback pauses Bunny and the previous native player", async () => {
  setup();
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  const send = vi.spyOn(frame.contentWindow!, "postMessage");
  ready(frame);
  const native = render(<><FeedVideoPlayer src="/one.mp4" /><FeedVideoPlayer src="/two.mp4" /></>);
  const [one, two] = native.container.querySelectorAll("video");
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  fireEvent.play(one!);
  expect(JSON.parse(send.mock.calls.at(-1)![0] as string).method).toBe("pause");
  const pause = vi.spyOn(one!, "pause");
  fireEvent.play(two!);
  expect(pause).toHaveBeenCalledOnce();
});

it("starts Bunny and native videos with saved sound enabled after a fresh session", async () => {
  state.startWithSound = true;
  setup();
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  expect(new URL(frame.src).searchParams.get("muted")).toBe("false");
  const send = vi.spyOn(frame.contentWindow!, "postMessage");
  ready(frame);
  expect(send.mock.calls.map(([data]) => JSON.parse(data as string).method)).toContain("unmute");
  const native = render(<FeedVideoPlayer src="/video.mp4" />);
  expect(native.container.querySelector("video")?.muted).toBe(false);
});

it("applies a saved default change without reloading the Bunny frame", async () => {
  const view = setup();
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  const send = vi.spyOn(frame.contentWindow!, "postMessage");
  ready(frame);
  state.startWithSound = true;
  view.update();
  expect(screen.getByTitle("Video")).toBe(frame);
  expect(send.mock.calls.map(([data]) => JSON.parse(data as string).method)).toContain("unmute");
});

it("applies low and normal volume to Bunny without reloading the frame", async () => {
  state.startWithSound = true;
  state.quietMode = true;
  const view = setup();
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  const send = vi.spyOn(frame.contentWindow!, "postMessage");
  ready(frame);
  const volumeMessages = () => send.mock.calls.map(([data]) => JSON.parse(data as string))
    .filter(message => message.method === "setVolume");
  expect(volumeMessages().at(-1).value).toBe(30);
  state.quietMode = false;
  view.update();
  expect(volumeMessages().at(-1).value).toBe(100);
  expect(screen.getByTitle("Video")).toBe(frame);
});

it("applies low volume to native playback and preserves manual volume until preference changes", () => {
  state.startWithSound = true;
  state.quietMode = true;
  const view = render(<FeedVideoPlayer src="/video.mp4" />);
  const video = view.container.querySelector("video")!;
  expect(video.volume).toBe(0.3);
  expect(video.muted).toBe(false);
  video.volume = 0.6;
  view.rerender(<FeedVideoPlayer src="/video.mp4" />);
  expect(video.volume).toBe(0.6);
  state.quietMode = false;
  view.rerender(<FeedVideoPlayer src="/video.mp4" />);
  expect(video.volume).toBe(1);
});

it("lets the viewer reveal provider controls before readiness", async () => {
  state.autoplay = false;
  setup();
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Play video" }));
  expect(frame.style.opacity).toBe("1");
  expect(frame).toHaveAttribute("aria-hidden", "false");
});

it("shows native loading during buffering and restores play on pause", () => {
  state.autoplay = false;
  const view = render(<FeedVideoPlayer src="/video.mp4" />);
  const video = view.container.querySelector("video")!;
  fireEvent.click(screen.getByRole("button", { name: "Play video" }));
  expect(video.play).toHaveBeenCalled();
  fireEvent.play(video);
  expect(screen.getByRole("status")).toHaveTextContent("Loading video…");
  fireEvent.playing(video);
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByRole("button", { name: "Play video" })).toBeNull();
  fireEvent.waiting(video);
  expect(screen.getByRole("status")).toBeVisible();
  fireEvent.pause(video);
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByRole("button", { name: "Play video" })).toBeVisible();
});

it("does not show loading when scrolling a ready video back into view", async () => {
  const view = setup();
  const frame = await screen.findByTitle("Video") as HTMLIFrameElement;
  expect(screen.queryByRole("status")).toBeNull();
  ready(frame);
  for (const visible of [false, true, false, true]) {
    state.visible = visible;
    view.update();
    expect(screen.queryByRole("status")).toBeNull();
    expect(frame.style.opacity).toBe("1");
    expect(screen.getByTitle("Video")).toBe(frame);
  }
});
