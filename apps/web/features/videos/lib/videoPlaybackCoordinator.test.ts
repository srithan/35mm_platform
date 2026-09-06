import { expect, it, vi } from "vitest";
import { createVideoPlaybackCoordinator } from "./videoPlaybackCoordinator";

it("keeps one visible owner and pauses it before handing off", () => {
  const coordinator = createVideoPlaybackCoordinator();
  const events: string[] = [];
  const one = Symbol(), two = Symbol();
  coordinator.register(one, { eligible: true, play: () => events.push("play one"), pause: () => events.push("pause one") });
  coordinator.register(two, { eligible: true, play: () => events.push("play two"), pause: () => events.push("pause two") });
  expect(events).toEqual(["play one"]);
  coordinator.update(one, false);
  expect(events).toEqual(["play one", "pause one", "play two"]);
  coordinator.update(two, false);
  expect(events.at(-1)).toBe("pause two");
});

it("manual playback claims ownership and unmount resumes a visible candidate", () => {
  const coordinator = createVideoPlaybackCoordinator();
  const one = Symbol(), two = Symbol();
  const first = { eligible: true, play: vi.fn(), pause: vi.fn() };
  const second = { eligible: false, play: vi.fn(), pause: vi.fn() };
  coordinator.register(one, first);
  const remove = coordinator.register(two, second);
  coordinator.claim(two);
  expect(first.pause).toHaveBeenCalledOnce();
  expect(second.play).not.toHaveBeenCalled();
  remove();
  expect(second.pause).toHaveBeenCalledOnce();
  expect(first.play).toHaveBeenCalledTimes(2);
});
