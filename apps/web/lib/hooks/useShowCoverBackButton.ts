"use client";

import { useEffect, useState } from "react";

/**
 * Whether to show the floating “Back” control on cover-based detail pages (community, festival).
 * Hidden for cold loads / new-tab deep links where there is no useful in-app history; shown when
 * the user arrived from same-origin (e.g. list page) or the history stack has more than one entry.
 */
export function useShowCoverBackButton(): boolean {
  const [show, setShow] = useState(false);

  useEffect(function () {
    if (typeof window === "undefined") return;

    const referrer = document.referrer;
    let sameOrigin = false;
    try {
      if (referrer) {
        sameOrigin = new URL(referrer).origin === window.location.origin;
      }
    } catch {
      sameOrigin = false;
    }

    const hasStack = window.history.length > 1;
    setShow(sameOrigin || hasStack);
  }, []);

  return show;
}
