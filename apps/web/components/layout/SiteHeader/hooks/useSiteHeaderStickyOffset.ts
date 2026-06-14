import { useLayoutEffect, useRef } from "react";
import { syncSiteHeaderStickyOffset } from "@/lib/utils/syncSiteHeaderStickyOffset";

export function useSiteHeaderStickyOffset() {
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(
    function () {
      const el = navRef.current;
      if (!el) return;

      function syncStickyOffset() {
        syncSiteHeaderStickyOffset();
      }

      syncStickyOffset();
      const ro = new ResizeObserver(syncStickyOffset);
      ro.observe(el);
      const mq = window.matchMedia("(min-width: 768px)");
      function onMq() {
        syncStickyOffset();
      }
      mq.addEventListener("change", onMq);
      return function () {
        ro.disconnect();
        mq.removeEventListener("change", onMq);
        document.documentElement.style.removeProperty("--site-header-sticky-offset");
      };
    },
    []
  );

  return navRef;
}
