"use client";

import { useEffect, useState } from "react";

const QUERY = "(min-width: 768px)";

/**
 * Viewport breakpoint used by Tailwind `md:` (768px). Returns null until after mount so
 * server HTML and the first client render match; use for branching that must mount only
 * one of two subtrees (avoid double data fetching).
 */
export function useIsDesktopMd(): boolean | null {
  const [value, setValue] = useState<boolean | null>(null);

  useEffect(function () {
    const mq = window.matchMedia(QUERY);
    setValue(mq.matches);
    function onChange() {
      setValue(mq.matches);
    }
    mq.addEventListener("change", onChange);
    return function () {
      mq.removeEventListener("change", onChange);
    };
  }, []);

  return value;
}
