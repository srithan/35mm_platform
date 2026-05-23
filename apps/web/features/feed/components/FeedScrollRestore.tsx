"use client";

import { useEffect } from "react";
import {
  SCROLL_KEY,
  RESTORE_FLAG_KEY,
  FROM_PATH_KEY,
} from "./PostPageBackButton";

export function ScrollRestore() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldRestore = sessionStorage.getItem(RESTORE_FLAG_KEY);
    const scrollY = sessionStorage.getItem(SCROLL_KEY);
    if (shouldRestore === "1" && scrollY !== null) {
      sessionStorage.removeItem(RESTORE_FLAG_KEY);
      sessionStorage.removeItem(SCROLL_KEY);
      sessionStorage.removeItem(FROM_PATH_KEY);
      const y = parseInt(scrollY, 10);
      if (!isNaN(y)) {
        requestAnimationFrame(() => {
          window.scrollTo(0, y);
        });
      }
    }
  }, []);

  return null;
}
