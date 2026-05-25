"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";
import { useIsDesktopLg } from "@/lib/hooks/useIsDesktopLg";
import { syncSiteHeaderStickyOffset } from "@/lib/utils/syncSiteHeaderStickyOffset";
import { ProfileMiniHeader } from "./ProfileMiniHeader";

/** Keep {@link ProfileMiniHeader} wired; set true to restore sticky cover summary on scroll. */
const PROFILE_MINI_HEADER_ENABLED = false;

function getHeaderStickyOffsetPx(): number {
  if (typeof document === "undefined") {
    return 72;
  }
  var raw = getComputedStyle(document.documentElement).getPropertyValue("--site-header-sticky-offset").trim();
  if (!raw) {
    return 72;
  }
  var n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 72;
}

/**
 * Pins {@link ProfileMiniHeader} flush under `#site-nav` (`lg:`), sized to the cover only.
 */
export function ProfileScrollChrome(props: {
  displayName: string;
  tagline: string;
  avatarUrl?: string | null;
  /** Cover banner only — docking rect excludes profile text so width matches photo. */
  cover: ReactNode;
  children: ReactNode;
}) {
  var coverDockRef = useRef<HTMLDivElement | null>(null);
  var sentinelRef = useRef<HTMLDivElement | null>(null);
  var rafRef = useRef<number>(0);
  var [dock, setDock] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });
  var [stickyTopPx, setStickyTopPx] = useState<number>(72);
  var [miniVisible, setMiniVisible] = useState(false);
  var [mounted, setMounted] = useState(false);
  var isDesktopLg = useIsDesktopLg();

  function syncMiniLayout() {
    if (typeof window === "undefined") return;
    var el = coverDockRef.current;
    if (!el) return;
    syncSiteHeaderStickyOffset();
    var r = el.getBoundingClientRect();
    setDock({ left: r.left, width: Math.max(0, r.width) });
    var nav = document.getElementById("site-nav");
    if (nav) {
      setStickyTopPx(Math.round(nav.getBoundingClientRect().bottom));
      return;
    }
    setStickyTopPx(Math.round(getHeaderStickyOffsetPx()));
  }

  useEffect(function () {
    setMounted(true);
  }, []);

  useLayoutEffect(function () {
    syncMiniLayout();
    if (typeof window === "undefined") return undefined;
    var ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncMiniLayout) : null;
    if (coverDockRef.current && ro) ro.observe(coverDockRef.current);
    return function () {
      ro?.disconnect();
    };
  }, []);

  useEffect(function () {
    function tick() {
      rafRef.current = 0;
      var s = sentinelRef.current;
      if (!s || typeof window === "undefined") return;
      syncMiniLayout();
      var nav = document.getElementById("site-nav");
      var offsetTop = nav ? Math.round(nav.getBoundingClientRect().bottom) : Math.round(getHeaderStickyOffsetPx());
      setMiniVisible(s.getBoundingClientRect().top < offsetTop);
    }

    function scheduleTick() {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(function () {
        tick();
      });
    }

    tick();
    window.addEventListener("scroll", scheduleTick, { passive: true });
    window.addEventListener("resize", scheduleTick);

    return function () {
      window.removeEventListener("scroll", scheduleTick);
      window.removeEventListener("resize", scheduleTick);
      window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  var dockOk = dock.width > 12;

  var miniHost =
    PROFILE_MINI_HEADER_ENABLED && mounted && dockOk && isDesktopLg === true ? (
      <div
        className={cn(
          "fixed z-[43] box-border",
          miniVisible ? "pointer-events-auto" : "pointer-events-none"
        )}
        style={{
          top: stickyTopPx,
          left: dock.left,
          width: dock.width,
        }}
      >
        <ProfileMiniHeader
          displayName={props.displayName}
          tagline={props.tagline}
          avatarUrl={props.avatarUrl}
          visible={miniVisible}
        />
      </div>
    ) : null;

  return (
    <>
      <div ref={coverDockRef} className="profile-cover-dock w-full min-w-0">
        {props.cover}
      </div>

      <div ref={sentinelRef} className="h-px w-full shrink-0 pointer-events-none" aria-hidden />

      {props.children}

      {miniHost ? createPortal(miniHost, document.body) : null}
    </>
  );
}
