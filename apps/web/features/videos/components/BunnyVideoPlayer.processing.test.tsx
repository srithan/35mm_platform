// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BunnyVideoPlayer } from "./BunnyVideoPlayer";
const state = vi.hoisted(() => ({ visible: true, playback: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "viewer", isLoaded: true, getToken: async () => "token" }) }));
vi.mock("@/features/settings/hooks/useSettings", () => ({ useSettingsQuery: () => ({ data: { appearance: { videoAutoplay: false } } }) }));
vi.mock("../hooks/useVideoVisibility", () => ({ useVideoVisibility: () => ({ ref: { current: null }, nearby: true, visible: state.visible }) }));
vi.mock("../api/videoApi", () => ({ getVideoPlayback: state.playback }));
const pending = { state: "processing", message: "Video processing. Playback will appear when it is ready.", width: 640, height: 360 };
beforeEach(() => { vi.useFakeTimers(); state.visible = true; state.playback.mockReset().mockResolvedValue(pending); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
async function tick(ms = 10) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = () => <QueryClientProvider client={client}><BunnyVideoPlayer assetId="asset" /></QueryClientProvider>;
  const view = render(tree());
  return { ...view, update: () => view.rerender(tree()) };
}
it("shows pending post and replaces it with playback automatically", async () => {
  setup(); await tick();
  expect(screen.getByRole("status")).toHaveTextContent("Video processing");
  expect(screen.queryByTitle("Video")).toBeNull();
  state.playback.mockResolvedValue({ embedUrl: "https://iframe.mediadelivery.net/embed/1/final?token=signed", width: 640, height: 360 });
  await tick(15010);
  expect(screen.getByTitle("Video")).toBeInTheDocument();
  const calls = state.playback.mock.calls.length;
  await tick(30000);
  expect(state.playback).toHaveBeenCalledTimes(calls);
});
it("pauses status polling offscreen and resumes when visible", async () => {
  const view = setup(); await tick();
  state.visible = false; view.update();
  await tick(60000);
  expect(state.playback).toHaveBeenCalledTimes(1);
  state.visible = true; view.update();
  await tick(15010);
  expect(state.playback).toHaveBeenCalledTimes(2);
});
it("stops after bounded polling and allows another explicit check", async () => {
  setup(); await tick();
  await tick(15_000 * 45);
  expect(state.playback).toHaveBeenCalledTimes(40);
  fireEvent.click(screen.getByRole("button", { name: "Check status" }));
  await tick();
  expect(state.playback).toHaveBeenCalledTimes(41);
});
it("shows terminal processing failures without a player or endless polling", async () => {
  state.playback.mockResolvedValue({ ...pending, state: "failed", message: "Video processing failed. Upload the video again." });
  setup(); await tick();
  expect(screen.getByRole("alert")).toHaveTextContent("Video processing failed");
  expect(screen.queryByTitle("Video")).toBeNull();
  await tick(60000);
  expect(state.playback).toHaveBeenCalledTimes(1);
});
