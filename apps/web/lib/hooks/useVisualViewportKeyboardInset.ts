"use client";

import { useEffect, useState } from "react";

/**
 * Pixels between the bottom of the layout viewport and the bottom of the visual viewport
 * (approximates overlap from the on-screen keyboard on mobile browsers).
 */
export function useVisualViewportKeyboardInset() {
  const [bottomInsetPx, setBottomInsetPx] = useState(0);

  useEffect(function () {
    function read() {
      const vv = window.visualViewport;
      if (!vv) {
        setBottomInsetPx(0);
        return;
      }
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setBottomInsetPx(overlap);
    }

    read();
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", read);
      vv.addEventListener("scroll", read);
    }
    window.addEventListener("resize", read);
    return function () {
      if (vv) {
        vv.removeEventListener("resize", read);
        vv.removeEventListener("scroll", read);
      }
      window.removeEventListener("resize", read);
    };
  }, []);

  return bottomInsetPx;
}
