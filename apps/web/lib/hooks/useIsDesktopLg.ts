"use client";

import { useEffect, useState } from "react";

const QUERY = "(min-width: 1024px)";

/**
 * Tailwind `lg:` breakpoint (1024px). Returns null until after mount so server HTML matches
 * the first client paint.
 */
export function useIsDesktopLg(): boolean | null {
  const [value, setValue] = useState<boolean | null>(null);

  useEffect(function () {
    var mq = window.matchMedia(QUERY);
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
