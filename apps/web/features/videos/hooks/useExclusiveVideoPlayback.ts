"use client";

import { useCallback, useEffect, useRef } from "react";
import { videoPlaybackCoordinator } from "../lib/videoPlaybackCoordinator";

export function useExclusiveVideoPlayback({ eligible, play, pause }: {
  eligible: boolean; play: () => void; pause: () => void;
}) {
  const id = useRef(Symbol("video"));
  const callbacks = useRef({ play, pause });
  callbacks.current = { play, pause };
  useEffect(() => videoPlaybackCoordinator.register(id.current, {
    eligible: false,
    play: () => callbacks.current.play(),
    pause: () => callbacks.current.pause(),
  }), []);
  useEffect(() => {
    videoPlaybackCoordinator.update(id.current, eligible);
  }, [eligible]);
  return useCallback(() => videoPlaybackCoordinator.claim(id.current), []);
}
