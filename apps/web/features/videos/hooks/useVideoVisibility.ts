"use client";

import { useEffect, useRef, useState } from "react";

/** Load only near the viewport; play only when at least half visible in an active tab. */
export function useVideoVisibility() {
  const ref = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const updateActive = () => setActive(!document.hidden);
    updateActive();
    document.addEventListener("visibilitychange", updateActive);
    if (typeof IntersectionObserver === "undefined") {
      setNearby(true);
      return () => document.removeEventListener("visibilitychange", updateActive);
    }
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearby(true);
        preload.disconnect();
      }
    }, { rootMargin: "300px" });
    const playback = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
    }, { threshold: [0, 0.5] });
    preload.observe(element);
    playback.observe(element);
    return () => {
      preload.disconnect();
      playback.disconnect();
      document.removeEventListener("visibilitychange", updateActive);
    };
  }, []);

  return { ref, nearby, visible: visible && active };
}
